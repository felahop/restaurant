import "server-only";
import { randomUUID } from "node:crypto";
import { buildReceiptLines } from "@/lib/payments/receipt";
import { db } from "@/server/db";
import { getPaymentProvider, siteUrl } from "./index";
import type { ReceiptInput } from "./types";
import { receiptConfig } from "./yookassa";

/** Чек для платежа, если включены «Чеки от ЮKassa» (YOOKASSA_RECEIPTS=true). */
async function receiptFor(orderId: string): Promise<ReceiptInput | undefined> {
  if (!receiptConfig()) return undefined;
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      total: true,
      deliveryFee: true,
      customerEmail: true,
      customerPhone: true,
      items: { select: { name: true, quantity: true, lineTotal: true, modifiers: { select: { name: true } } } },
    },
  });
  return {
    email: order.customerEmail,
    phone: order.customerEmail ? null : order.customerPhone,
    lines: buildReceiptLines({
      total: order.total,
      deliveryFee: order.deliveryFee,
      lines: order.items.map((i) => ({
        name: i.modifiers.length ? `${i.name} (${i.modifiers.map((m) => m.name).join(", ")})` : i.name,
        quantity: i.quantity,
        lineTotal: i.lineTotal,
      })),
    }),
  };
}

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
    receipt: await receiptFor(order.id),
  });
  await db.order.update({
    where: { id: order.id },
    data: { paymentId: created.paymentId, paymentProvider: provider.name, paymentStatus: "PENDING" },
  });
  return created.confirmationUrl;
}
