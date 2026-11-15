import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { StaffAdmin } from "@/components/admin/misc/StaffAdmin";
import { requireAdmin } from "@/server/admin/auth";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Сотрудники" };
/** Админка: переходы могут ждать данные (свежесть важнее мгновенного кадра). */
export const instant = false;

export default async function StaffPage() {
  const me = await requireAdmin("staff");
  const rows = await db.adminUser.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] });
  return (
    <div className="flex max-w-240 flex-col gap-2">
      <AdminPageHeader title="Сотрудники" description="Владелец видит всё. Менеджер — заказы, меню и брони." />
      <StaffAdmin
        rows={rows.map((r) => ({
          id: r.id,
          login: r.login,
          name: r.name,
          role: r.role,
          isActive: r.isActive,
          lastLoginAt: r.lastLoginAt?.toISOString() ?? null,
          isMe: r.id === me.id,
        }))}
      />
    </div>
  );
}
