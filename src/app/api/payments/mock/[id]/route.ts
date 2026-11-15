import { z } from "zod";
import { db } from "@/server/db";
import { isSameOrigin, jsonError } from "@/server/http";
import { getPaymentProvider, isMockPayments } from "@/server/payments";
import { signMockBody, MOCK_SIGNATURE_HEADER } from "@/server/payments/mock";
import { siteUrl } from "@/server/payments";

const bodySchema = z.object({ action: z.enum(["succeed", "cancel"]) });

/**
 * Тестовая страница оплаты нажала «Оплатить» или «Отказаться».
 * Как настоящий сервис: меняем статус платежа и отправляем подписанное уведомление на наш вебхук.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isMockPayments()) return jsonError(404, "Тестовые платежи выключены");
  if (!isSameOrigin(request)) return jsonError(403, "Запрос с другого сайта");
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Неизвестное действие");

  const payment = await db.mockPayment.findUnique({ where: { id } });
  if (!payment) return jsonError(404, "Платёж не найден");
  if (payment.status !== "pending") return Response.json({ redirect: payment.returnUrl });

  const status = parsed.data.action === "succeed" ? "succeeded" : "canceled";
  await db.mockPayment.update({ where: { id }, data: { status } });

  const body = JSON.stringify({ type: "notification", event: `payment.${status}`, object: { id, status } });
  const webhookUrl = `${siteUrl()}/api/payments/webhook/mock`;
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", [MOCK_SIGNATURE_HEADER]: signMockBody(body) },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`webhook ${res.status}`);
  } catch (e) {
    // Если сайт не видит сам себя по NEXT_PUBLIC_SITE_URL, обрабатываем напрямую — для разработки этого достаточно.
    console.warn("[payments:mock] не удалось отправить уведомление, обрабатываю напрямую", e);
    const { processPaymentNotification } = await import("@/server/payments/process");
    await processPaymentNotification(getPaymentProvider("mock"), {
      eventId: `payment.${status}:${id}`,
      event: `payment.${status}`,
      paymentId: id,
      payload: JSON.parse(body),
    });
  }
  return Response.json({ redirect: payment.returnUrl });
}
