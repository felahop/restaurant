import { after } from "next/server";
import { z } from "zod";
import { BOOKING, isValidBookingTime } from "@/lib/booking";
import { toE164 } from "@/lib/phone";
import { getUser } from "@/server/auth/user";
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
  const reservation = await db.reservation.create({
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
