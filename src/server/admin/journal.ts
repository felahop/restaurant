import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import type { AuditSection } from "./audit";

export const SECTION_LABELS: Record<AuditSection, string> = {
  auth: "Вход",
  orders: "Заказы",
  menu: "Меню",
  reservations: "Брони",
  delivery: "Доставка",
  marketing: "Маркетинг",
  reviews: "Отзывы",
  analytics: "Аналитика",
  settings: "Настройки",
  staff: "Сотрудники",
};

export const PAGE_SIZE = 50;

export function isAuditSection(v: unknown): v is AuditSection {
  return typeof v === "string" && v in SECTION_LABELS;
}

/** Журнал действий: новые сверху, постранично (курсор — id последней записи). */
export async function listJournal(opts: { section?: AuditSection; adminId?: string; cursor?: string }) {
  const where: Prisma.AdminAuditLogWhereInput = {
    ...(opts.section ? { section: opts.section } : {}),
    ...(opts.adminId ? { adminUserId: opts.adminId } : {}),
  };
  const rows = await db.adminAuditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    select: { id: true, createdAt: true, adminName: true, adminLogin: true, section: true, summary: true, ip: true },
  });
  const hasMore = rows.length > PAGE_SIZE;
  return { rows: rows.slice(0, PAGE_SIZE), next: hasMore ? rows[PAGE_SIZE - 1]!.id : null };
}
