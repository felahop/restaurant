import { after } from "next/server";
import { z } from "zod";
import { BOOKING, isValidBookingTime, seatsLeftAt } from "@/lib/booking";
import { toE164 } from "@/lib/phone";
import { getUser } from "@/server/auth/user";
import { bookingCapacity } from "@/server/booking";
import { db } from "@/server/db";
import { clientIp, isSameOrigin, jsonError } from "@/server/http";
import { notifySafely } from "@/server/notify";
import { siteUrl } from "@/server/payments";
import { rateLimit } from "@/server/rate-limit";
import { getSettings } from "@/server/settings";

const schema = z.object({
  startsAt: z.iso.datetime(),
  guests: z.number().int().min(1).max(BOOKING.maxGuests),
  name: z.string().trim().min(1, "Как к вам обращаться?").max(60),
  phone: z.string().max(30).refine((v) => toE164(v) !== null, "Нужно 10 цифр после +7"),
  comment: z.string().trim().max(500).optional(),
  consent: z.literal(true, { error: "Нужно согласие на обработку персональных данных" }),
});

/** Бронь столика. Время проверяется по часам зала; ресторан получает уведомление без персональных данных. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Запрос с другого сайта");
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Проверьте поля брони");
  const input = parsed.data;
  const phone = toE164(input.phone)!;

  const [byIp, byPhone] = await Promise.all([
    rateLimit(`booking-ip:${clientIp(request)}`, 5, 3600),
    rateLimit(`booking-phone:${phone}`, 3, 86_400),
  ]);
  if (!byIp.ok || !byPhone.ok) return jsonError(429, "Слишком много броней подряд. Позвоните нам — поможем.");

  const settings = await getSettings();
  const startsAt = new Date(input.startsAt).toISOString();
  if (!isValidBookingTime(startsAt, settings.openingHours, settings.timezone, new Date())) {
    return jsonError(409, "Это время уже недоступно. Выберите другое.", { code: "TIME_INVALID" });
  }
  const user = await getUser();
  // Места проверяются под общей блокировкой: две одновременные брони не займут один и тот же стол.
  const reservation = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(727001)`;
    const occupied = await tx.reservation.findMany({
      where: {
        status: { in: ["NEW", "CONFIRMED"] },
        startsAt: {
          gt: new Date(new Date(startsAt).getTime() - settings.bookingDurationMinutes * 60_000),
          lt: new Date(new Date(startsAt).getTime() + settings.bookingDurationMinutes * 60_000),
        },
      },
      select: { startsAt: true, guests: true },
    });
    const left = seatsLeftAt(new Date(startsAt), {
      seats: settings.bookingCapacity,
      durationMinutes: settings.bookingDurationMinutes,
      occupied,
    });
    if (left < input.guests) return { full: true as const, left };
    const created = await tx.reservation.create({
      data: {
        startsAt: new Date(startsAt),
        guests: input.guests,
        name: input.name,
        phone,
        comment: input.comment || null,
        userId: user?.id ?? null,
        consentAt: new Date(),
      },
      select: { id: true },
    });
    return { full: false as const, id: created.id };
  });
  if (reservation.full) {
    return jsonError(409, reservation.left > 0 ? `На это время осталось мест: ${reservation.left}. Выберите другое время или позвоните нам.` : "На это время зал занят. Выберите другое время.", {
      code: "FULL",
      seatsLeft: reservation.left,
    });
  }

  const whenLabel = new Intl.DateTimeFormat("ru-RU", {
    timeZone: settings.timezone,
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startsAt));
  after(() => notifySafely((n) => n.newReservation({ whenLabel, guests: input.guests, adminUrl: `${siteUrl()}/admin/reservations` })));
  return Response.json({ ok: true, id: reservation.id, whenLabel }, { status: 201 });
}
