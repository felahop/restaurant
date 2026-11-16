import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import type { PaymentProvider, VerifiedNotification } from "./types";

export type ProcessResult =
  | { result: "duplicate" }
  | { result: "ignored"; reason: string }
  | { result: "paid"; orderId: string; orderNumber: number; firstTime: boolean }
  | { result: "canceled"; orderId: string };

/** Начисление бонусов: процент от оплаченных блюд (без доставки), вниз до рубля. 1 бонус = 1 ₽ = 100 коп. */
export function bonusForOrder(
  order: { subtotal: number; discount: number; bonusSpent: number },
  percent: number,
): number {
  const base = Math.max(0, order.subtotal - order.discount - order.bonusSpent);
  return Math.floor((base * Math.max(0, percent)) / 100 / 100) * 100;
}

/**
 * Обработка уведомления платёжного сервиса. Идемпотентна:
 *  - событие записывается в PaymentEvent с уникальным (provider, eventId): повтор не обрабатывается дважды;
 *  - статус берётся из API сервиса, а не из тела уведомления;
 *  - заказ блокируется (SELECT … FOR UPDATE), оплаченный заказ повторно не меняется;
 *  - бонусы начисляются одной записью BonusTransaction с уникальной парой (orderId, EARN).
 */
export async function processPaymentNotification(
  provider: PaymentProvider,
  n: VerifiedNotification,
): Promise<ProcessResult> {
  try {
    await db.paymentEvent.create({
      data: {
        provider: provider.name,
        eventId: n.eventId,
        paymentId: n.paymentId,
        type: n.event,
        payload: (n.payload ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const existing = await db.paymentEvent.findUnique({
        where: { provider_eventId: { provider: provider.name, eventId: n.eventId } },
      });
      // Обработано — просто подтверждаем. Если прошлый раз упал посередине, обработаем снова (это безопасно).
      if (existing?.processedAt) return { result: "duplicate" };
    } else {
      throw e;
    }
  }

  const payment = await provider.fetchPayment(n.paymentId);
  if (!payment.orderId) return finish(provider, n, { result: "ignored", reason: "У платежа нет номера заказа" });

  const settings = await db.settings.findUnique({ where: { id: 1 }, select: { bonusEarnPercent: true } });

  const outcome = await db.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<
      { id: string }[]
    >`SELECT "id" FROM "Order" WHERE "id" = ${payment.orderId} FOR UPDATE`;
    if (!locked.length) return { result: "ignored", reason: "Заказ не найден" } as const;
    const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId! } });

    if (payment.status === "succeeded") {
      if (order.paymentStatus === "SUCCEEDED") {
        return { result: "paid", orderId: order.id, orderNumber: order.number, firstTime: false } as const;
      }
      if (payment.currency !== "RUB" || payment.amount !== order.total) {
        console.error(
          `[payments] сумма платежа ${payment.id} (${payment.amount}) не совпадает с заказом №${order.number} (${order.total})`,
        );
        return { result: "ignored", reason: "Сумма платежа не совпадает с заказом" } as const;
      }
      const now = new Date();
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "SUCCEEDED",
          paidAt: now,
          paymentId: payment.id,
          paymentProvider: provider.name,
          status: order.status === "AWAITING_PAYMENT" ? "ACCEPTED" : order.status,
          acceptedAt: order.acceptedAt ?? now,
          // Оплата пришла уже после отмены — деньги нужно вернуть (решает владелец).
          ...(order.status === "CANCELED" && !order.refundStatus ? { refundStatus: "REQUESTED" as const } : {}),
        },
      });
      if (order.promoCodeId) {
        // Деньги уже получены — промокод засчитываем даже сверх лимита.
        await tx.promoCode.update({ where: { id: order.promoCodeId }, data: { usedCount: { increment: 1 } } });
      }
      if (order.userId && order.status !== "CANCELED") {
        const amount = bonusForOrder(order, settings?.bonusEarnPercent ?? 0);
        if (amount > 0) {
          const created = await tx.bonusTransaction.createMany({
            data: [
              { userId: order.userId, orderId: order.id, type: "EARN", amount, comment: `Заказ №${order.number}` },
            ],
            skipDuplicates: true,
          });
          if (created.count > 0) {
            await tx.user.update({ where: { id: order.userId }, data: { bonusBalance: { increment: amount } } });
            await tx.order.update({ where: { id: order.id }, data: { bonusEarned: amount } });
          }
        }
      }
      return { result: "paid", orderId: order.id, orderNumber: order.number, firstTime: true } as const;
    }

    if (payment.status === "canceled") {
      if (order.paymentStatus !== "SUCCEEDED" && (order.paymentId === payment.id || !order.paymentId)) {
        await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "CANCELED" } });
      }
      return { result: "canceled", orderId: order.id } as const;
    }

    return { result: "ignored", reason: `Статус ${payment.status} не требует действий` } as const;
  });

  return finish(provider, n, outcome);
}

async function finish(
  provider: PaymentProvider,
  n: VerifiedNotification,
  outcome: ProcessResult,
): Promise<ProcessResult> {
  await db.paymentEvent.update({
    where: { provider_eventId: { provider: provider.name, eventId: n.eventId } },
    data: { processedAt: new Date() },
  });
  return outcome;
}
