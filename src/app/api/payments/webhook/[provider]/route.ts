import { after } from "next/server";
import { syncRefund } from "@/server/admin/refunds";
import { jsonError } from "@/server/http";
import { notifyOrderIfDue } from "@/server/order-notify";
import { getPaymentProvider, isMockPayments } from "@/server/payments";
import { processPaymentNotification } from "@/server/payments/process";

/**
 * Входящие уведомления платёжного сервиса: POST /api/payments/webhook/yookassa (или /mock в разработке).
 * Отвечаем 200 только после успешной обработки — иначе сервис повторит уведомление.
 */
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: name } = await params;
  const configured = isMockPayments() ? "mock" : (process.env.PAYMENT_PROVIDER ?? "mock");
  if (name !== configured) return jsonError(404, "Неизвестный платёжный сервис");

  const provider = getPaymentProvider(name);
  const raw = await request.text();
  const notification = await provider.verifyNotification(request, raw);
  if (!notification) return jsonError(403, "Уведомление не прошло проверку подлинности");

  try {
    // Уведомления о возвратах (refund.succeeded): статус берём из API сервиса по id возврата.
    if (notification.event.startsWith("refund.")) {
      const status = await syncRefund(notification.paymentId, provider.name);
      return Response.json({ ok: true, result: status ?? "ignored" });
    }
    const result = await processPaymentNotification(provider, notification);
    if (result.result === "paid" && result.firstTime) {
      after(() => notifyOrderIfDue(result.orderId));
    }
    return Response.json({ ok: true, result: result.result });
  } catch (e) {
    console.error("[payments] не удалось обработать уведомление", e);
    return jsonError(500, "Ошибка обработки, повторите позже");
  }
}
