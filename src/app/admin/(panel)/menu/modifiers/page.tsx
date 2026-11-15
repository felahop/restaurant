import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { MenuTabs } from "@/components/admin/menu/MenuTabs";
import { ModifierGroupsEditor } from "@/components/admin/menu/ModifierGroupsEditor";
import { requireAdmin } from "@/server/admin/auth";
import { modifierGroupsWithModifiers } from "@/server/admin/menu";

export const metadata: Metadata = { title: "Добавки" };
/** Админка: переходы могут ждать данные (свежесть важнее мгновенного кадра). */
export const instant = false;

export default async function ModifiersPage() {
  await requireAdmin("menu");
  const groups = (await modifierGroupsWithModifiers()).map((g) => ({
    id: g.id,
    name: g.name,
    minSelect: String(g.minSelect),
    maxSelect: String(g.maxSelect),
    dishCount: g._count.dishes,
    modifiers: g.modifiers.map((m) => ({ id: m.id, name: m.name, price: String(m.price / 100), isAvailable: m.isAvailable })),
  }));
  return (
    <div className="flex max-w-240 flex-col gap-2">
      <AdminPageHeader title="Меню" description="Группы добавок общие: одну группу можно подключить к нескольким блюдам." />
      <MenuTabs active="/admin/menu/modifiers" />
      <ModifierGroupsEditor groups={groups} />
    </div>
  );
}
