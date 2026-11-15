/** Цепочки статусов заказа. Используются в админке и на странице гостя. */

export type OrderStatusValue = "AWAITING_PAYMENT" | "ACCEPTED" | "COOKING" | "DELIVERING" | "READY" | "COMPLETED" | "CANCELED";
export type OrderTypeValue = "DELIVERY" | "PICKUP";

export const FLOW: Record<OrderTypeValue, OrderStatusValue[]> = {
  DELIVERY: ["ACCEPTED", "COOKING", "DELIVERING", "COMPLETED"],
  PICKUP: ["ACCEPTED", "COOKING", "READY", "COMPLETED"],
};

export function statusLabel(status: OrderStatusValue, type: OrderTypeValue): string {
  switch (status) {
    case "AWAITING_PAYMENT":
      return "Ждёт оплату";
    case "ACCEPTED":
      return "Принят";
    case "COOKING":
      return "Готовится";
    case "DELIVERING":
      return "Передан курьеру";
    case "READY":
      return "Готов к выдаче";
    case "COMPLETED":
      return type === "DELIVERY" ? "Доставлен" : "Выдан";
    case "CANCELED":
      return "Отменён";
  }
}

/** Следующий шаг для кнопки «одним нажатием». */
export function nextStatus(status: OrderStatusValue, type: OrderTypeValue): OrderStatusValue | null {
  const flow = FLOW[type];
  const i = flow.indexOf(status);
  return i >= 0 && i < flow.length - 1 ? flow[i + 1]! : null;
}

/** Можно ли перевести заказ в статус: только вперёд по цепочке (с пропуском шагов) или отмена. */
export function canTransition(from: OrderStatusValue, to: OrderStatusValue, type: OrderTypeValue): boolean {
  if (from === to) return false;
  if (from === "COMPLETED" || from === "CANCELED") return false;
  if (to === "CANCELED") return true;
  if (from === "AWAITING_PAYMENT") return false; // не оплачен — на кухню не отдаём
  const flow = FLOW[type];
  const a = flow.indexOf(from);
  const b = flow.indexOf(to);
  return a >= 0 && b > a;
}

export const STATUS_TIMESTAMP: Partial<Record<OrderStatusValue, "acceptedAt" | "cookingAt" | "deliveringAt" | "readyAt" | "completedAt" | "canceledAt">> = {
  ACCEPTED: "acceptedAt",
  COOKING: "cookingAt",
  DELIVERING: "deliveringAt",
  READY: "readyAt",
  COMPLETED: "completedAt",
  CANCELED: "canceledAt",
};
