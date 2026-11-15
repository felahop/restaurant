import "server-only";
import { headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import type { CurrentAdmin } from "./auth";

export type AuditSection =
  | "auth"
  | "orders"
  | "menu"
  | "reservations"
  | "delivery"
  | "marketing"
  | "reviews"
  | "analytics"
  | "settings"
  | "staff";

export type AuditEntry = {
  section: AuditSection;
  /** Код действия: order.status, dish.update, … — для фильтров и отчётов. */
  action: string;
  /** Что произошло, по-русски: «Заказ №130: Принят → Готовится». Без телефонов и адресов гостей. */
  summary: string;
  entityId?: string | null;
  meta?: Prisma.InputJsonValue;
};

async function requestIp(): Promise<string | null> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  } catch {
    return null; // вне запроса (скрипты) IP нет
  }
}

/**
 * Запись в журнал действий. Ошибка журнала не должна ломать само действие сотрудника,
 * поэтому она только пишется в лог сервера.
 */
export async function audit(admin: Pick<CurrentAdmin, "id" | "login" | "name">, entry: AuditEntry): Promise<void> {
  try {
    await db.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        adminName: admin.name,
        adminLogin: admin.login,
        section: entry.section,
        action: entry.action,
        summary: entry.summary.slice(0, 500),
        entityId: entry.entityId ?? null,
        meta: entry.meta,
        ip: await requestIp(),
      },
    });
  } catch (e) {
    console.error("[audit] не удалось записать действие", entry.action, e);
  }
}
