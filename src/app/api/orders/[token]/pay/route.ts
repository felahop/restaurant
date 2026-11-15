import { db } from "@/server/db";
import { clientIp, isSameOrigin, jsonError } from "@/server/http";
import { startPayment } from "@/server/payments/start";
import { rateLimit } from "@/server/rate-limit";

/** Новая попытка оплаты (например, после «Оплата не прошла»). */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!isSameOrigin(request)) return jsonError(403, "Запрос с другого сайта");
  const { token } = await params;
  const limit = await rateLimit(`pay:${clientIp(request)}`, 10, 600);
  if (!limit.ok)
    return jsonError(429, "Слишком много попыток. Подождите несколько минут.", { retryAfter: limit.retryAfter });

  const order = await db.order.findUnique({ where: { publicToken: token } });
  if (!order) return jsonError(404, "Заказ не найден");
  if (order.paymentStatus === "SUCCEEDED") return jsonError(409, "Заказ уже оплачен");
  if (order.status !== "AWAITING_PAYMENT" || (order.paymentMethod !== "CARD_ONLINE" && order.paymentMethod !== "SBP")) {
    return jsonError(409, "Этот заказ не ждёт онлайн-оплату");
  }
  try {
    const confirmationUrl = await startPayment(order);
    return Response.json({ confirmationUrl });
  } catch (e) {
    console.error("[payments] не удалось создать платёж", e);
    return jsonError(502, "Платёжный сервис не ответил. Попробуйте ещё раз через минуту.");
  }
}
