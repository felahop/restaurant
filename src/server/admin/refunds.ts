import "server-only";
import { formatRub } from "@/lib/money";
import { db } from "@/server/db";
import { getPaymentProvider } from "@/server/payments";
import { receiptFor } from "@/server/payments/start";
import type { RefundSnapshot } from "@/server/payments/types";
import type { CurrentAdmin } from "./auth";
import { audit } from "./audit";

/**
 * Возвраты денег за отменённые оплаченные заказы. Сайт сам деньги не возвращает:
 * при отмене создаётся заявка (REQUESTED), решение — «вернуть» или «не возвращать» с причиной — принимает владелец.
 */

export class RefundError extends Error {}

const STATUS_FROM_PROVIDER = { succeeded: "SUCCEEDED", pending: "PENDING", canceled: "FAILED" } as const;

async function applySnapshot(orderId: string, r: RefundSnapshot) {
  const status = STATUS_FROM_PROVIDER[r.status];
  await db.order.update({
    where: { id: orderId },
    data: {
      refundStatus: status,
      refundId: r.id,
      ...(status === "SUCCEEDED" ? { paymentStatus: "REFUNDED", refundAmount: r.amount || undefined } : {}),
    },
  });
  return status;
}

export async function approveRefund(orderId: string, admin: CurrentAdmin) {
  // 1. Блокируем заявку: два одновременных нажатия не создадут два возврата.
  const order = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
    const o = await tx.order.findUnique({ where: { id: orderId } });
    if (!o) throw new RefundError("Заказ не найден");
    if (o.refundStatus !== "REQUESTED" && o.refundStatus !== "FAILED") throw new RefundError("По этому заказу решение уже принято");
    if (!o.paymentId || o.paymentStatus !== "SUCCEEDED") throw new RefundError("Заказ не оплачен онлайн — возвращать нечего");
    const decidedAt = new Date();
    await tx.order.update({
      where: { id: orderId },
      data: { refundStatus: "PENDING", refundAmount: o.total, refundDecidedAt: decidedAt, refundDecidedBy: admin.name, refundNote: null },
    });
    return { ...o, decidedAt };
  });

  // 2. Возврат в платёжном сервисе. Сумма возврата не может превысить платёж, поэтому повтор после сбоя безопасен.
  let status: string;
  try {
    const provider = getPaymentProvider(order.paymentProvider ?? undefined);
    const snapshot = await provider.createRefund({
      paymentId: order.paymentId!,
      amount: order.total,
      description: `Отмена заказа №${order.number}`,
      idempotenceKey: `refund-${order.id}-${order.decidedAt.getTime()}`,
      receipt: await receiptFor(order.id),
    });
    status = await applySnapshot(order.id, snapshot);
  } catch (e) {
    console.error("[refund] платёжный сервис не принял возврат", e);
    await db.order.update({
      where: { id: order.id },
      data: { refundStatus: "FAILED", refundNote: "Платёжный сервис не принял возврат. Попробуйте ещё раз или оформите в кабинете сервиса." },
    });
    status = "FAILED";
  }

  await audit(admin, {
    section: "refunds",
    action: "refund.approve",
    entityId: order.id,
    summary:
      status === "FAILED"
        ? `Попытка вернуть ${formatRub(order.total)} за заказ №${order.number} — сервис отказал`
        : `Вернул ${formatRub(order.total)} за заказ №${order.number}${status === "PENDING" ? " (обрабатывается)" : ""}`,
  });
  return status;
}

export async function declineRefund(orderId: string, note: string, admin: CurrentAdmin) {
  const updated = await db.order.updateMany({
    where: { id: orderId, refundStatus: { in: ["REQUESTED", "FAILED"] } },
    data: { refundStatus: "DECLINED", refundNote: note, refundDecidedAt: new Date(), refundDecidedBy: admin.name },
  });
  if (updated.count === 0) throw new RefundError("По этому заказу решение уже принято");
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId }, select: { number: true, total: true } });
  await audit(admin, {
    section: "refunds",
    action: "refund.decline",
    entityId: orderId,
    summary: `Отказал в возврате ${formatRub(o.total)} за заказ №${o.number}. Причина: ${note}`,
  });
}

/** Статус возврата из платёжного сервиса (уведомление refund.succeeded или ручная проверка). */
export async function syncRefund(refundId: string, providerName?: string) {
  const order = await db.order.findUnique({ where: { refundId }, select: { id: true, paymentProvider: true } });
  if (!order) return null;
  const snapshot = await getPaymentProvider(providerName ?? order.paymentProvider ?? undefined).fetchRefund(refundId);
  return applySnapshot(order.id, snapshot);
}

export async function listRefunds() {
  return db.order.findMany({
    where: { refundStatus: { not: null } },
    orderBy: [{ refundDecidedAt: { sort: "desc", nulls: "first" } }, { canceledAt: "desc" }],
    take: 100,
    select: {
      id: true,
      number: true,
      total: true,
      paymentMethod: true,
      paidAt: true,
      canceledAt: true,
      cancelReason: true,
      refundStatus: true,
      refundNote: true,
      refundDecidedAt: true,
      refundDecidedBy: true,
    },
  });
}
