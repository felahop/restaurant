import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { MenuBoard } from "@/components/admin/menu/MenuBoard";
import { MenuTabs } from "@/components/admin/menu/MenuTabs";
import { requireAdmin } from "@/server/admin/auth";
import { adminMenu } from "@/server/admin/menu";

export const metadata: Metadata = { title: "Меню" };
/** Админка: переходы могут ждать данные (свежесть важнее мгновенного кадра). */
export const instant = false;

export default async function AdminMenuPage() {
  await requireAdmin("menu");
  const categories = await adminMenu();
  return (
    <div className="flex max-w-240 flex-col gap-2">
      <AdminPageHeader title="Меню" description="Изменения появляются на сайте сразу после сохранения." />
      <MenuTabs active="/admin/menu" />
      <MenuBoard categories={categories} />
    </div>
  );
}
