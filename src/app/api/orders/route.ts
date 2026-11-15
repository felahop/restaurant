import { randomBytes } from "node:crypto";
import { after } from "next/server";
import { calculateQuote } from "@/lib/order/calc";
import { isValidSlot } from "@/lib/order/schedule";
import { ONLINE_METHODS, orderRequestSchema, paymentLabels } from "@/lib/order/schemas";
import { toE164 } from "@/lib/phone";
import { loadQuoteContext, pointFromToken, scheduleInfo } from "@/server/checkout";
import { db } from "@/server/db";
import { clientIp, isSameOrigin, jsonError } from "@/server/http";
import { notifySafely } from "@/server/notify";
import { startPayment } from "@/server/payments/start";
import { rateLimit } from "@/server/rate-limit";
import { getSettings } from "@/server/settings";

class PromoExhaustedError extends Error {}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Оформление заказа. Суммы пересчитываются на сервере по ценам из базы. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Запрос с другого сайта");
  const limit = await rateLimit(`order:${clientIp(request)}`, 10, 600);
  if (!limit.ok)
    return jsonError(429, "Слишком много заказов подряд. Подождите несколько минут.", { retryAfter: limit.retryAfter });

  const parsed = orderRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Проверьте данные заказа", {
      fields: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const input = parsed.data;
  const now = new Date();
  const settings = await getSettings();

  // Время
  if (settings.ordersPaused)
    return jsonError(409, "Мы временно не принимаем заказы. Загляните чуть позже.", { code: "PAUSED" });
  const schedule = await scheduleInfo(now);
  if (input.when.kind === "asap" && !schedule.asapAvailable) {
    return jsonError(
      409,
      `Кухня сейчас закрыта. Выберите время${schedule.nextOpeningLabel ? ` — откроемся ${schedule.nextOpeningLabel}` : ""}.`,
      {
        code: "CLOSED",
      },
    );
  }
  if (
    input.when.kind === "slot" &&
    !isValidSlot(new Date(input.when.slot).toISOString(), {
      hours: settings.orderHours,
      timeZone: settings.timezone,
      now,
      stepMinutes: settings.scheduleStepMinutes,
      leadMinutes: settings.scheduleLeadMinutes,
      daysAhead: settings.scheduleDaysAhead,
    })
  ) {
    return jsonError(409, "Это время уже недоступно. Выберите другое.", { code: "SLOT_INVALID" });
  }

  // Адрес
  const address = input.type === "DELIVERY" ? pointFromToken(input.addressToken) : null;
  if (input.type === "DELIVERY" && !address) {
    return jsonError(400, "Выберите адрес доставки из подсказок", { code: "ADDRESS_REQUIRED" });
  }

  // Суммы
  const ctx = await loadQuoteContext(input.items, input.promoCode, now);
  const quote = calculateQuote({ ...input, point: address }, ctx);
  if (!quote.canOrder)
    return jsonError(422, quote.issues[0]?.message ?? "Заказ нельзя оформить", { issues: quote.issues });

  const online = ONLINE_METHODS.includes(input.payment);
  const promoApplied = quote.promo?.applied ? quote.promo : null;
  const publicToken = randomBytes(24).toString("base64url");

  let order;
  try {
    order = await db.$transaction(async (tx) => {
      // Промокод с лимитом расходуем атомарно. Для онлайн-оплаты — после подтверждения платежа (этап 5).
      if (promoApplied?.promoId && !online) {
        const updated = await tx.$executeRaw`
          UPDATE "PromoCode" SET "usedCount" = "usedCount" + 1
          WHERE "id" = ${promoApplied.promoId} AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")`;
        if (updated === 0) throw new PromoExhaustedError();
      }
      return tx.order.create({
        data: {
          publicToken,
          type: input.type,
          status: online ? "AWAITING_PAYMENT" : "ACCEPTED",
          acceptedAt: online ? null : now,
          customerName: input.customer.name,
          customerPhone: toE164(input.customer.phone)!,
          comment: input.customer.comment || null,
          cutlery: input.customer.cutlery,
          addressText: address?.value ?? null,
          addressLat: address?.lat ?? null,
          addressLng: address?.lng ?? null,
          apartment: input.addressDetails?.apartment || null,
          entrance: input.addressDetails?.entrance || null,
          floor: input.addressDetails?.floor || null,
          intercom: input.addressDetails?.intercom || null,
          zoneId: quote.delivery?.zone?.id ?? null,
          scheduledFor: input.when.kind === "slot" ? new Date(input.when.slot) : null,
          subtotal: quote.subtotal,
          deliveryFee: quote.delivery?.fee ?? 0,
          discount: quote.discount,
          bonusSpent: quote.bonusSpent,
          total: quote.total,
          promoCodeId: promoApplied?.promoId ?? null,
          promoCodeRaw: promoApplied?.code ?? null,
          paymentMethod: input.payment,
          paymentStatus: online ? "PENDING" : "NOT_REQUIRED",
          consentAt: now,
          items: {
            create: quote.lines.map((l) => ({
              dishId: l.dishId,
              name: l.name,
              basePrice: l.basePrice,
              unitPrice: l.unitPrice,
              quantity: l.qty,
              lineTotal: l.lineTotal,
              modifiers: {
                create: l.modifiers.map((m) => ({
                  modifierId: m.id,
                  groupName: m.groupName,
                  name: m.name,
                  price: m.price,
                })),
              },
            })),
          },
        },
        select: { id: true, number: true, publicToken: true, total: true, paymentMethod: true },
      });
    });
  } catch (e) {
    if (e instanceof PromoExhaustedError) {
      return jsonError(409, "Промокод только что закончился. Уберите его и оформите заказ ещё раз.", {
        code: "PROMO_EXHAUSTED",
      });
    }
    throw e;
  }

  if (!online) {
    const whenLabel =
      input.when.kind === "asap"
        ? "как можно скорее"
        : (schedule.slots.find(
            (s) => s.value === new Date(input.when.kind === "slot" ? input.when.slot : 0).toISOString(),
          )?.label ?? "ко времени");
    after(() =>
      notifySafely((n) =>
        n.newOrder({
          number: order.number,
          type: input.type,
          total: quote.total,
          paymentLabel: paymentLabels[input.payment],
          whenLabel,
          itemsCount: quote.lines.reduce((s, l) => s + l.qty, 0),
          adminUrl: `${SITE_URL}/admin/orders/${order.id}`,
        }),
      ),
    );
  }

  if (online) {
    // Заказ сохранён и ждёт оплаты. Оплаченным он станет только по уведомлению платёжного сервиса.
    try {
      const paymentUrl = await startPayment(order);
      return Response.json(
        { token: order.publicToken, number: order.number, next: "payment", paymentUrl },
        { status: 201 },
      );
    } catch (e) {
      console.error("[payments] не удалось создать платёж", e);
      return Response.json(
        { token: order.publicToken, number: order.number, next: "status", paymentError: true },
        { status: 201 },
      );
    }
  }

  return Response.json({ token: order.publicToken, number: order.number, next: "status" }, { status: 201 });
}
