import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { zonedParts, zonedTimeToUtc } from "@/lib/order/schedule";
import { canTransition, STATUS_TIMESTAMP, type OrderStatusValue } from "@/lib/order/status";
import { db } from "@/server/db";
import { bonusForOrder } from "@/server/payments/process";
import { getSettings } from "@/server/settings";

export type FeedFilter = "active" | "awaiting" | "done" | "canceled" | "all";

const FILTER_STATUSES: Record<FeedFilter, OrderStatusValue[] | null> = {
  active: ["ACCEPTED", "COOKING", "DELIVERING", "READY"],
  awaiting: ["AWAITING_PAYMENT"],
  done: ["COMPLETED"],
  canceled: ["CANCELED"],
  all: null,
};

/** Границы местных суток ресторана в UTC. date — «ГГГГ-ММ-ДД» или пусто (сегодня). */
export async function dayRange(date?: string | null) {
  const { timezone } = await getSettings();
  let y: number, m: number, d: number;
  const match = date ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(date) : null;
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    const p = zonedParts(new Date(), timezone);
    [y, m, d] = [p.year, p.month, p.day];
  }
  const from = zonedTimeToUtc(y, m, d, 0, 0, timezone);
  const to = new Date(from.getTime() + 86_400_000);
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { from, to, iso, timezone };
}

const feedSelect = {
  id: true,
  number: true,
  type: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  total: true,
  scheduledFor: true,
  createdAt: true,
  comment: true,
  cutlery: true,
  addressText: true,
  items: { select: { name: true, quantity: true, modifiers: { select: { name: true } } } },
} satisfies Prisma.OrderSelect;

export type FeedOrder = Prisma.OrderGetPayload<{ select: typeof feedSelect }>;

export async function listOrders(opts: { date?: string | null; filter?: FeedFilter }) {
  const { from, to, iso } = await dayRange(opts.date);
  const statuses = FILTER_STATUSES[opts.filter ?? "active"];
  // Заказ ко времени попадает в ленту дня, на который он назначен.
  const orders = await db.order.findMany({
    where: {
      ...(statuses ? { status: { in: statuses } } : {}),
      OR: [
        { scheduledFor: null, createdAt: { gte: from, lt: to } },
        { scheduledFor: { gte: from, lt: to } },
      ],
    },
    orderBy: [{ createdAt: "desc" }],
    select: feedSelect,
    take: 300,
  });
  return { date: iso, orders };
}

export async function getAdminOrder(id: string) {
  return db.order.findUnique({
    where: { id },
    include: { items: { include: { modifiers: true } }, zone: { select: { name: true } }, promoCode: { select: { code: true } } },
  });
}

export class TransitionError extends Error {}

/**
 * Смена статуса. При завершении заказа с оплатой при получении начисляем бонусы гостю (один раз).
 * Онлайн-заказы получают бонусы при оплате (src/server/payments/process.ts).
 */
export async function changeOrderStatus(orderId: string, to: OrderStatusValue, cancelReason?: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new TransitionError("Заказ не найден");
    if (!canTransition(order.status, to, order.type)) throw new TransitionError("Этот переход статуса недоступен");

    const now = new Date();
    const field = STATUS_TIMESTAMP[to];
    const data: Prisma.OrderUpdateInput = { status: to, ...(field ? { [field]: now } : {}) };
    if (to === "CANCELED") data.cancelReason = cancelReason?.trim() || "Отменён рестораном";
    await tx.order.update({ where: { id: orderId }, data });

    if (to === "COMPLETED" && order.userId && order.paymentStatus === "NOT_REQUIRED") {
      const settings = await tx.settings.findUnique({ where: { id: 1 }, select: { bonusEarnPercent: true } });
      const amount = bonusForOrder(order, settings?.bonusEarnPercent ?? 0);
      if (amount > 0) {
        const created = await tx.bonusTransaction.createMany({
          data: [{ userId: order.userId, orderId, type: "EARN", amount, comment: `Заказ №${order.number}` }],
          skipDuplicates: true,
        });
        if (created.count) {
          await tx.user.update({ where: { id: order.userId }, data: { bonusBalance: { increment: amount } } });
          await tx.order.update({ where: { id: orderId }, data: { bonusEarned: amount } });
        }
      }
    }
    return { number: order.number };
  });
}
