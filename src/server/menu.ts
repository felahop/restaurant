import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/server/db";
import type { DishDetails, MenuCategory, MenuDish, MenuModifierGroup } from "@/lib/menu/types";
import { requiresChoice } from "@/lib/menu/pricing";
import type { SpiceLevelValue } from "@/types/dish";

/** Тег кэша меню: админ-панель сбрасывает его при любой правке блюд, категорий и добавок. */
export const MENU_TAG = "menu";

const dishInclude = {
  modifierGroups: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      group: {
        include: { modifiers: { orderBy: { sortOrder: "asc" as const } } },
      },
    },
  },
};

type DishRow = Awaited<ReturnType<typeof loadDishes>>[number];

function loadDishes(where: object) {
  return db.dish.findMany({
    where: { deletedAt: null, ...where },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { ...dishInclude, category: true },
  });
}

function toGroups(row: DishRow): MenuModifierGroup[] {
  return row.modifierGroups.map(({ group }) => ({
    id: group.id,
    name: group.name,
    minSelect: group.minSelect,
    maxSelect: group.maxSelect,
    modifiers: group.modifiers.map((m) => ({ id: m.id, name: m.name, price: m.price, isAvailable: m.isAvailable })),
  }));
}

function clampSpice(n: number): SpiceLevelValue {
  return Math.max(0, Math.min(3, Math.trunc(n))) as SpiceLevelValue;
}

function toMenuDish(row: DishRow): MenuDish {
  const groups = toGroups(row);
  return {
    id: row.id,
    slug: row.slug,
    categoryId: row.categoryId,
    name: row.name,
    description: row.description,
    portion: row.portion,
    price: row.price,
    oldPrice: row.oldPrice,
    imageUrl: row.imageUrl,
    kanji: row.kanji ?? row.category.kanji,
    isHit: row.isHit,
    isNew: row.isNew,
    isVegan: row.isVegan,
    isGlutenFree: row.isGlutenFree,
    spiciness: clampSpice(row.spiciness),
    soldOut: !row.isAvailable,
    hasModifiers: groups.length > 0,
    requiresChoice: requiresChoice(groups),
  };
}

function toDetails(row: DishRow): DishDetails {
  return {
    ...toMenuDish(row),
    categoryName: row.category.name,
    categorySlug: row.category.slug,
    composition: row.composition,
    weightGrams: row.weightGrams,
    volumeMl: row.volumeMl,
    kcal: row.kcal,
    proteins: row.proteins,
    fats: row.fats,
    carbs: row.carbs,
    allergens: row.allergens,
    groups: toGroups(row),
  };
}

/** Всё меню: видимые категории по порядку, внутри — блюда (включая стоп-лист). */
export async function getMenu(): Promise<MenuCategory[]> {
  "use cache";
  cacheTag(MENU_TAG);
  cacheLife("hours");

  const [categories, rows] = await Promise.all([
    db.category.findMany({ where: { isHidden: false }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    loadDishes({ category: { isHidden: false } }),
  ]);
  return categories
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      kanji: c.kanji,
      dishes: rows.filter((r) => r.categoryId === c.id).map(toMenuDish),
    }))
    .filter((c) => c.dishes.length > 0);
}

export async function getDishBySlug(slug: string): Promise<DishDetails | null> {
  "use cache";
  cacheTag(MENU_TAG);
  cacheLife("hours");

  const row = await db.dish.findFirst({
    where: { slug, deletedAt: null, category: { isHidden: false } },
    include: { ...dishInclude, category: true },
  });
  return row ? toDetails(row) : null;
}

/** Хиты для главной: доступные блюда с меткой «Хит». */
export async function getHits(limit = 4): Promise<MenuDish[]> {
  const menu = await getMenu();
  return menu
    .flatMap((c) => c.dishes)
    .filter((d) => d.isHit)
    .sort((a, b) => Number(Boolean(a.soldOut)) - Number(Boolean(b.soldOut)))
    .slice(0, limit);
}

/**
 * «С этим берут»: по одному блюду из других категорий — сначала хиты, затем по порядку меню.
 * Отдельной настройки в админке нет, подбор автоматический.
 */
export async function getPairings(dish: Pick<MenuDish, "id" | "categoryId">, limit = 4): Promise<MenuDish[]> {
  const menu = await getMenu();
  const picks: MenuDish[] = [];
  const others = menu.filter((c) => c.id !== dish.categoryId);
  // Сначала дополняем основное блюдо закусками и напитками (последние категории меню).
  for (const category of [...others].reverse()) {
    const available = category.dishes.filter((d) => !d.soldOut && d.id !== dish.id);
    const pick = available.find((d) => d.isHit) ?? available[0];
    if (pick) picks.push(pick);
    if (picks.length >= limit) break;
  }
  return picks;
}
