import "server-only";
import { db } from "@/server/db";
import type { CurrentAdmin } from "./auth";
import { canAccess } from "./roles";

/**
 * Сигналы для ленты заказов: новые брони, необработанные сообщения и заявки на возврат.
 * Возвращаются id — лента звучит, когда появляется id, которого она ещё не видела.
 * Сообщения и возвраты видит только тот, кому доступны эти разделы.
 */
export async function adminAlerts(admin: CurrentAdmin) {
  const [reservations, messages, refunds] = await Promise.all([
    canAccess(admin.role, "reservations")
      ? db.reservation.findMany({
          where: { status: "NEW", startsAt: { gte: new Date() } },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true },
        })
      : null,
    canAccess(admin.role, "messages")
      ? db.contactMessage.findMany({ where: { handledAt: null }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true } })
      : null,
    canAccess(admin.role, "refunds")
      ? db.order.findMany({ where: { refundStatus: { in: ["REQUESTED", "FAILED"] } }, take: 20, select: { id: true } })
      : null,
  ]);
  const ids = (rows: { id: string }[] | null) => (rows ? rows.map((r) => r.id) : null);
  return { reservations: ids(reservations), messages: ids(messages), refunds: ids(refunds) };
}

export type AdminAlerts = Awaited<ReturnType<typeof adminAlerts>>;
