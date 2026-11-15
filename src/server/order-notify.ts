import "server-only";
import { isOrderDue } from "@/lib/order/preorder";
import { paymentLabels } from "@/lib/order/schemas";
import { formatRub } from "@/lib/money";
import { db } from "@/server/db";
import { notifySafely } from "@/server/notify";
import { siteUrl } from "@/server/payments";
import { getSettings } from "@/server/settings";

/**
 * Уведомление ресторана о заказе — один раз: «как можно скорее» сразу, предзаказ — за N минут до времени
 * (Settings.preorderAlertMinutes). notifiedAt ставится атомарно, поэтому повторный вызов ничего не отправит.
 */
export async function notifyOrderIfDue(orderId: string, now = new Date()): Promise<boolean> {
  const [order, settings] = await Promise.all([
    db.order.findUnique({ where: { id: orderId }, include: { items: { select: { quantity: true } } } }),
    getSettings(),
  ]);
  if (!order || order.notifiedAt || !isOrderDue(order, settings.preorderAlertMinutes, now)) return false;
  const claimed = await db.order.updateMany({ where: { id: orderId, notifiedAt: null }, data: { notifiedAt: now } });
  if (claimed.count === 0) return false;

  const time = (d: Date) =>
    new Intl.DateTimeFormat("ru-RU", { timeZone: settings.timezone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
  const paid = order.paymentStatus === "SUCCEEDED" ? ` · оплачен ${formatRub(order.total)}` : "";
  await notifySafely((n) =>
    n.newOrder({
      number: order.number,
      type: order.type,
      total: order.total,
      paymentLabel: `${paymentLabels[order.paymentMethod]}${paid}`,
      whenLabel: order.scheduledFor ? `предзаказ к ${time(order.scheduledFor)}` : "как можно скорее",
      itemsCount: order.items.reduce((s, i) => s + i.quantity, 0),
      adminUrl: `${siteUrl()}/admin/orders/${order.id}`,
    }),
  );
  return true;
}

/** Напоминания о предзаказах, время которых подошло. Вызывается лентой заказов и (по желанию) cron. */
export async function sendDuePreorderReminders(now = new Date()): Promise<number> {
  const { preorderAlertMinutes } = await getSettings();
  const due = await db.order.findMany({
    where: {
      notifiedAt: null,
      status: { in: ["ACCEPTED", "COOKING", "DELIVERING", "READY"] },
      // Не напоминаем о давно прошедших заказах (например, если сервер долго был выключен).
      scheduledFor: { lte: new Date(now.getTime() + preorderAlertMinutes * 60_000), gte: new Date(now.getTime() - 6 * 3_600_000) },
    },
    select: { id: true },
    take: 50,
  });
  let sent = 0;
  for (const o of due) if (await notifyOrderIfDue(o.id, now)) sent++;
  return sent;
}
