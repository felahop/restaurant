import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { getPaymentProvider, siteUrl } from "./index";

/** Создаёт платёж для заказа, ожидающего оплаты, и запоминает его id. Возвращает ссылку на оплату. */
export async function startPayment(order: {
  id: string;
  number: number;
  total: number;
  publicToken: string;
  paymentMethod: string;
}): Promise<string> {
  const provider = getPaymentProvider();
  const method = order.paymentMethod === "SBP" ? "SBP" : "CARD_ONLINE";
  const created = await provider.createPayment({
    orderId: order.id,
    orderNumber: order.number,
    amount: order.total,
    method,
    returnUrl: `${siteUrl()}/order/${order.publicToken}`,
    description: `Заказ №${order.number}`,
    // Новая попытка — новый ключ: прошлый платёж мог быть отменён.
    idempotenceKey: randomUUID(),
  });
  await db.order.update({
    where: { id: order.id },
    data: { paymentId: created.paymentId, paymentProvider: provider.name, paymentStatus: "PENDING" },
  });
  return created.confirmationUrl;
}
