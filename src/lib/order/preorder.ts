/** Предзаказы: ресторан узнаёт о них (сигнал в ленте и уведомление) за N минут до времени. */

export type AlertableOrder = { status: string; scheduledFor: Date | string | null };

/** Пора ли сообщить ресторану о заказе. «Как можно скорее» — сразу, предзаказ — за alertMinutes до времени. */
export function isOrderDue(order: AlertableOrder, alertMinutes: number, now: Date = new Date()): boolean {
  if (order.status === "AWAITING_PAYMENT" || order.status === "CANCELED") return false;
  if (!order.scheduledFor) return true;
  return new Date(order.scheduledFor).getTime() - alertMinutes * 60_000 <= now.getTime();
}

/** Когда ресторан получит сигнал о предзаказе. */
export function alertAt(scheduledFor: Date | string, alertMinutes: number): Date {
  return new Date(new Date(scheduledFor).getTime() - alertMinutes * 60_000);
}
