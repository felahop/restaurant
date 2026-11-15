import { after } from "next/server";
import { formatRub } from "@/lib/money";
import { paymentLabels } from "@/lib/order/schemas";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";
import { notifySafely } from "@/server/notify";
import { getPaymentProvider, isMockPayments, siteUrl } from "@/server/payments";
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
    const result = await processPaymentNotification(provider, notification);
    if (result.result === "paid" && result.firstTime) {
      after(async () => {
        const order = await db.order.findUnique({ where: { id: result.orderId }, include: { items: true } });
        if (!order) return;
        await notifySafely((n) =>
          n.newOrder({
            number: order.number,
            type: order.type,
            total: order.total,
            paymentLabel: `${paymentLabels[order.paymentMethod]} · оплачен ${formatRub(order.total)}`,
            whenLabel: order.scheduledFor ? "ко времени" : "как можно скорее",
            itemsCount: order.items.reduce((s, i) => s + i.quantity, 0),
            adminUrl: `${siteUrl()}/admin/orders/${order.id}`,
          }),
        );
      });
    }
    return Response.json({ ok: true, result: result.result });
  } catch (e) {
    console.error("[payments] не удалось обработать уведомление", e);
    return jsonError(500, "Ошибка обработки, повторите позже");
  }
}
