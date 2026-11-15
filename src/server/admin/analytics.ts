import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { bucketize, delta, periodRange, summarize, type AnalyticsPeriod } from "@/lib/admin/analytics";
import { db } from "@/server/db";
import { getSettings } from "@/server/settings";

/** В выручку идут принятые заказы: отменённые и неоплаченные онлайн не считаем. */
const COUNTED: Prisma.OrderWhereInput["status"] = { notIn: ["CANCELED", "AWAITING_PAYMENT"] };

const TOP_LIMIT = 10;

export async function getAnalytics(period: AnalyticsPeriod, now = new Date()) {
  const { timezone } = await getSettings();
  const range = periodRange(period, now, timezone);
  const current: Prisma.OrderWhereInput = { status: COUNTED, createdAt: { gte: range.from, lt: range.to } };

  const [orders, prev, top] = await Promise.all([
    db.order.findMany({ where: current, select: { createdAt: true, total: true } }),
    db.order.aggregate({
      where: { status: COUNTED, createdAt: { gte: range.prevFrom, lt: range.prevTo } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    db.orderItem.groupBy({
      by: ["name"],
      where: { order: current },
      _sum: { quantity: true, lineTotal: true },
      orderBy: [{ _sum: { quantity: "desc" } }, { _sum: { lineTotal: "desc" } }, { name: "asc" }],
      take: TOP_LIMIT,
    }),
  ]);

  const series = bucketize(orders, range);
  const revenue = series.reduce((s, b) => s + b.revenue, 0);
  const summary = summarize(revenue, orders.length);
  const previous = summarize(prev._sum.total ?? 0, prev._count._all);

  return {
    period,
    timezone,
    series,
    summary,
    deltas: {
      revenue: delta(summary.revenue, previous.revenue),
      orders: delta(summary.orders, previous.orders),
      average: delta(summary.average, previous.average),
    },
    topDishes: top.map((t) => ({ name: t.name, quantity: t._sum.quantity ?? 0, revenue: t._sum.lineTotal ?? 0 })),
  };
}

export type AnalyticsData = Awaited<ReturnType<typeof getAnalytics>>;

/** Данные для CSV-выгрузки за период. Персональных данных гостей (имя, телефон, адрес) в выгрузке нет. */
export async function getExportRows(kind: "orders" | "revenue" | "dishes", period: AnalyticsPeriod, now = new Date()) {
  const { timezone } = await getSettings();
  const range = periodRange(period, now, timezone);
  const inRange = { createdAt: { gte: range.from, lt: range.to } };
  const counted: Prisma.OrderWhereInput = { status: COUNTED, ...inRange };

  if (kind === "orders") {
    const orders = await db.order.findMany({
      where: inRange,
      orderBy: { createdAt: "asc" },
      select: {
        number: true,
        createdAt: true,
        scheduledFor: true,
        type: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        subtotal: true,
        deliveryFee: true,
        discount: true,
        bonusSpent: true,
        total: true,
        promoCodeRaw: true,
        cancelReason: true,
        zone: { select: { name: true } },
      },
    });
    return { kind: "orders" as const, timezone, range, orders };
  }
  if (kind === "dishes") {
    const dishes = await db.orderItem.groupBy({
      by: ["name"],
      where: { order: counted },
      _sum: { quantity: true, lineTotal: true },
      orderBy: [{ _sum: { quantity: "desc" } }, { name: "asc" }],
    });
    return { kind: "dishes" as const, timezone, range, dishes: dishes.map((d) => ({ name: d.name, quantity: d._sum.quantity ?? 0, revenue: d._sum.lineTotal ?? 0 })) };
  }
  const orders = await db.order.findMany({ where: counted, select: { createdAt: true, total: true } });
  return { kind: "revenue" as const, timezone, range, series: bucketize(orders, range) };
}
