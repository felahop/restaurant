import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { CategoriesEditor } from "@/components/admin/menu/CategoriesEditor";
import { MenuTabs } from "@/components/admin/menu/MenuTabs";
import { requireAdmin } from "@/server/admin/auth";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Категории" };
/** Админка: переходы могут ждать данные (свежесть важнее мгновенного кадра). */
export const instant = false;

export default async function CategoriesPage() {
  await requireAdmin("menu");
  const rows = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { dishes: { where: { deletedAt: null } } } } },
  });
  const categories = rows.map((c) => ({ id: c.id, name: c.name, isHidden: c.isHidden, kanji: c.kanji, dishCount: c._count.dishes }));
  return (
    <div className="flex max-w-240 flex-col gap-2">
      <AdminPageHeader title="Меню" />
      <MenuTabs active="/admin/menu/categories" />
      <CategoriesEditor categories={categories} />
    </div>
  );
}
