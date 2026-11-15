import "server-only";
import { db } from "@/server/db";
import { slugify } from "@/lib/slug";

/** Всё меню для админки: и скрытые категории, и стоп-лист, без удалённых блюд. */
export async function adminMenu() {
  const [categories, dishes] = await Promise.all([
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { dishes: { where: { deletedAt: null } } } } } }),
    db.dish.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, categoryId: true, price: true, isAvailable: true, isHit: true, isNew: true, imageUrl: true, kanji: true, portion: true },
    }),
  ]);
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    isHidden: c.isHidden,
    dishCount: c._count.dishes,
    dishes: dishes.filter((d) => d.categoryId === c.id),
  }));
}

export async function adminDish(id: string) {
  return db.dish.findFirst({
    where: { id, deletedAt: null },
    include: { modifierGroups: { orderBy: { sortOrder: "asc" }, select: { groupId: true } } },
  });
}

export async function modifierGroupsWithModifiers() {
  return db.modifierGroup.findMany({
    orderBy: { name: "asc" },
    include: { modifiers: { orderBy: { sortOrder: "asc" } }, _count: { select: { dishes: true } } },
  });
}

/** Уникальный slug: при совпадении добавляем -2, -3… (учитываются и удалённые блюда — их адреса не переиспользуем). */
export async function uniqueDishSlug(base: string, exceptId?: string) {
  const root = slugify(base) || "dish";
  for (let i = 1; i < 200; i++) {
    const candidate = i === 1 ? root : `${root}-${i}`;
    const existing = await db.dish.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === exceptId) return candidate;
  }
  return `${root}-${Date.now()}`;
}

export async function uniqueCategorySlug(base: string, exceptId?: string) {
  const root = slugify(base) || "category";
  for (let i = 1; i < 200; i++) {
    const candidate = i === 1 ? root : `${root}-${i}`;
    const existing = await db.category.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === exceptId) return candidate;
  }
  return `${root}-${Date.now()}`;
}
