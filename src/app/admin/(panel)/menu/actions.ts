"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { fail, ok, zodFields, type ActionResult } from "@/lib/admin/result";
import { AdminAccessError, assertAdmin } from "@/server/admin/auth";
import { uniqueCategorySlug, uniqueDishSlug } from "@/server/admin/menu";
import { db } from "@/server/db";
import { MENU_TAG } from "@/server/menu";

const ALLERGENS = [
  "GLUTEN", "CRUSTACEANS", "EGGS", "FISH", "PEANUTS", "SOY", "MILK", "TREE_NUTS", "CELERY", "MUSTARD", "SESAME", "SULPHITES", "MOLLUSCS",
] as const;

const optionalInt = (max: number) => z.number().int().min(0).max(max).nullable();
const optionalNum = z.number().min(0).max(1000).nullable();
/** Цена из формы в рублях → копейки. */
const rubles = z.number().positive("Цена должна быть больше нуля").max(1_000_000).transform((v) => Math.round(v * 100));

const dishSchema = z
  .object({
    name: z.string().trim().min(2, "Название — хотя бы 2 символа").max(80),
    slug: z.string().trim().max(80).regex(/^[a-z0-9-]*$/, "Только латиница, цифры и дефис").optional(),
    categoryId: z.string().min(1, "Выберите категорию"),
    description: z.string().trim().min(5, "Добавьте короткое описание").max(200),
    composition: z.string().trim().min(3, "Укажите состав").max(1000),
    portion: z.string().trim().min(1, "Укажите выход порции").max(40),
    weightGrams: optionalInt(5000),
    volumeMl: optionalInt(5000),
    kcal: optionalInt(10_000),
    proteins: optionalNum,
    fats: optionalNum,
    carbs: optionalNum,
    allergens: z.array(z.enum(ALLERGENS)).max(ALLERGENS.length),
    spiciness: z.number().int().min(0).max(3),
    price: rubles,
    oldPrice: rubles.nullable(),
    imageUrl: z
      .string()
      .max(500)
      .refine((v) => v.startsWith("/uploads/") || v.startsWith("/images/") || v.startsWith("https://"), "Некорректная ссылка на фото")
      .nullable(),
    kanji: z.string().trim().max(2).nullable(),
    isHit: z.boolean(),
    isNew: z.boolean(),
    isVegan: z.boolean(),
    isGlutenFree: z.boolean(),
    isAvailable: z.boolean(),
    groupIds: z.array(z.string().min(1)).max(10),
  })
  .refine((d) => d.oldPrice == null || d.oldPrice > d.price, { message: "Старая цена должна быть больше новой", path: ["oldPrice"] });

export type DishInput = z.input<typeof dishSchema>;

async function guard(): Promise<ActionResult | null> {
  try {
    await assertAdmin("menu");
    return null;
  } catch (e) {
    if (e instanceof AdminAccessError) return fail(e.message);
    throw e;
  }
}

export async function saveDishAction(id: string | null, input: DishInput): Promise<ActionResult<{ id: string }>> {
  const denied = await guard();
  if (denied) return denied;
  const parsed = dishSchema.safeParse(input);
  if (!parsed.success) return fail("Проверьте поля формы", zodFields(parsed.error.issues));
  const { groupIds, slug: slugInput, ...data } = parsed.data;

  const category = await db.category.findUnique({ where: { id: data.categoryId }, select: { id: true } });
  if (!category) return fail("Категория не найдена", { categoryId: "Категория не найдена" });
  const groups = await db.modifierGroup.count({ where: { id: { in: groupIds } } });
  if (groups !== new Set(groupIds).size) return fail("Группа добавок не найдена");

  const slug = await uniqueDishSlug(slugInput || data.name, id ?? undefined);
  const dish = await db.$transaction(async (tx) => {
    const saved = id
      ? await tx.dish.update({ where: { id }, data: { ...data, slug } })
      : await tx.dish.create({
          data: {
            ...data,
            slug,
            sortOrder: ((await tx.dish.aggregate({ where: { categoryId: data.categoryId }, _max: { sortOrder: true } }))._max.sortOrder ?? 0) + 10,
          },
        });
    await tx.dishModifierGroup.deleteMany({ where: { dishId: saved.id } });
    if (groupIds.length) {
      await tx.dishModifierGroup.createMany({
        data: [...new Set(groupIds)].map((groupId, i) => ({ dishId: saved.id, groupId, sortOrder: i * 10 })),
      });
    }
    return saved;
  });
  updateTag(MENU_TAG);
  return ok(id ? "Блюдо сохранено" : "Блюдо создано — оно уже в меню", { id: dish.id });
}

export async function toggleAvailabilityAction(dishId: string, isAvailable: boolean): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  const dish = await db.dish.update({ where: { id: dishId }, data: { isAvailable: Boolean(isAvailable) }, select: { name: true } });
  updateTag(MENU_TAG);
  return ok(isAvailable ? `«${dish.name}» снова в продаже` : `«${dish.name}» в стоп-листе`);
}

export async function duplicateDishAction(dishId: string): Promise<ActionResult<{ id: string }>> {
  const denied = await guard();
  if (denied) return denied;
  const src = await db.dish.findFirst({ where: { id: dishId, deletedAt: null }, include: { modifierGroups: true } });
  if (!src) return fail("Блюдо не найдено");
  const { id: _id, createdAt: _c, updatedAt: _u, modifierGroups, ...rest } = src;
  void _id;
  void _c;
  void _u;
  const copy = await db.dish.create({
    data: {
      ...rest,
      name: `${src.name} (копия)`,
      slug: await uniqueDishSlug(`${src.slug}-kopiya`),
      isAvailable: false, // копия не появляется в продаже, пока её не проверят
      sortOrder: src.sortOrder + 1,
      modifierGroups: { create: modifierGroups.map((g) => ({ groupId: g.groupId, sortOrder: g.sortOrder })) },
    },
  });
  updateTag(MENU_TAG);
  return ok("Копия создана и пока в стоп-листе", { id: copy.id });
}

/** Мягкое удаление: блюдо пропадает из меню, история заказов остаётся целой. */
export async function deleteDishAction(dishId: string): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  await db.dish.update({ where: { id: dishId }, data: { deletedAt: new Date(), isHit: false } });
  updateTag(MENU_TAG);
  return ok("Блюдо удалено из меню");
}

const idsSchema = z.array(z.string().min(1)).max(500);

export async function reorderDishesAction(categoryId: string, orderedIds: string[]): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  const ids = idsSchema.parse(orderedIds);
  await db.$transaction(ids.map((id, i) => db.dish.updateMany({ where: { id, categoryId }, data: { sortOrder: (i + 1) * 10 } })));
  updateTag(MENU_TAG);
  return ok("Порядок сохранён");
}

const categorySchema = z.object({
  name: z.string().trim().min(2, "Название — хотя бы 2 символа").max(60),
  kanji: z.string().trim().max(2).nullable(),
  isHidden: z.boolean(),
});

export async function saveCategoryAction(id: string | null, input: z.input<typeof categorySchema>): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return fail("Проверьте поля", zodFields(parsed.error.issues));
  if (id) {
    await db.category.update({ where: { id }, data: parsed.data });
  } else {
    const max = (await db.category.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? 0;
    await db.category.create({ data: { ...parsed.data, slug: await uniqueCategorySlug(parsed.data.name), sortOrder: max + 10 } });
  }
  updateTag(MENU_TAG);
  return ok(id ? "Категория сохранена" : "Категория создана");
}

export async function reorderCategoriesAction(orderedIds: string[]): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  const ids = idsSchema.parse(orderedIds);
  await db.$transaction(ids.map((id, i) => db.category.update({ where: { id }, data: { sortOrder: (i + 1) * 10 } })));
  updateTag(MENU_TAG);
  return ok("Порядок категорий сохранён");
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  const count = await db.dish.count({ where: { categoryId: id } });
  if (count > 0) return fail("В категории есть блюда (в том числе удалённые). Скройте её или перенесите блюда.");
  await db.category.delete({ where: { id } });
  updateTag(MENU_TAG);
  return ok("Категория удалена");
}

const groupSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    minSelect: z.number().int().min(0).max(10),
    maxSelect: z.number().int().min(1).max(20),
    modifiers: z
      .array(
        z.object({
          id: z.string().nullable(),
          name: z.string().trim().min(1, "Название добавки").max(60),
          price: z.number().min(0).max(100_000).transform((v) => Math.round(v * 100)),
          isAvailable: z.boolean(),
        }),
      )
      .min(1, "Нужна хотя бы одна добавка")
      .max(30),
  })
  .refine((g) => g.minSelect <= g.maxSelect, { message: "Минимум больше максимума", path: ["minSelect"] })
  .refine((g) => g.minSelect <= g.modifiers.length, { message: "Минимум больше числа добавок", path: ["minSelect"] });

export type GroupInput = z.input<typeof groupSchema>;

export async function saveModifierGroupAction(id: string | null, input: GroupInput): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  const parsed = groupSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Проверьте поля", zodFields(parsed.error.issues));
  const { modifiers, ...group } = parsed.data;
  await db.$transaction(async (tx) => {
    const saved = id ? await tx.modifierGroup.update({ where: { id }, data: group }) : await tx.modifierGroup.create({ data: group });
    const keep = modifiers.filter((m) => m.id).map((m) => m.id!);
    // Убранные добавки удаляем: в старых заказах их названия и цены сохранены снимком.
    await tx.modifier.deleteMany({ where: { groupId: saved.id, id: { notIn: keep } } });
    for (const [i, m] of modifiers.entries()) {
      const data = { name: m.name, price: m.price, isAvailable: m.isAvailable, sortOrder: (i + 1) * 10 };
      if (m.id) await tx.modifier.update({ where: { id: m.id, groupId: saved.id }, data });
      else await tx.modifier.create({ data: { ...data, groupId: saved.id } });
    }
  });
  updateTag(MENU_TAG);
  return ok("Группа добавок сохранена");
}

export async function deleteModifierGroupAction(id: string): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  await db.modifierGroup.delete({ where: { id } });
  updateTag(MENU_TAG);
  return ok("Группа удалена у всех блюд");
}
