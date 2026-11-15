import "server-only";
import { formatRub } from "@/lib/money";
import type { DishFormValues } from "@/components/admin/menu/DishForm";
import { db } from "@/server/db";
import { adminDish, modifierGroupsWithModifiers } from "./menu";

const str = (n: number | null | undefined) => (n == null ? "" : String(n));
const rub = (kopecks: number | null | undefined) => (kopecks == null ? "" : String(kopecks / 100));

export async function dishFormData(id: string | null) {
  const [dish, categories, groups] = await Promise.all([
    id ? adminDish(id) : Promise.resolve(null),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    modifierGroupsWithModifiers(),
  ]);
  const groupOptions = groups.map((g) => ({
    id: g.id,
    name: g.name,
    summary: `${g.minSelect ? `обязательно, ` : ""}до ${g.maxSelect}: ${g.modifiers.map((m) => `${m.name}${m.price ? ` +${formatRub(m.price)}` : ""}`).join(", ")}`,
  }));
  const initial: DishFormValues = dish
    ? {
        name: dish.name,
        slug: dish.slug,
        categoryId: dish.categoryId,
        description: dish.description,
        composition: dish.composition,
        portion: dish.portion,
        weightGrams: str(dish.weightGrams),
        volumeMl: str(dish.volumeMl),
        kcal: str(dish.kcal),
        proteins: str(dish.proteins),
        fats: str(dish.fats),
        carbs: str(dish.carbs),
        allergens: dish.allergens,
        spiciness: String(Math.max(0, Math.min(3, dish.spiciness))) as DishFormValues["spiciness"],
        price: rub(dish.price),
        oldPrice: rub(dish.oldPrice),
        imageUrl: dish.imageUrl,
        kanji: dish.kanji ?? "",
        isHit: dish.isHit,
        isNew: dish.isNew,
        isVegan: dish.isVegan,
        isGlutenFree: dish.isGlutenFree,
        isAvailable: dish.isAvailable,
        groupIds: dish.modifierGroups.map((g) => g.groupId),
      }
    : {
        name: "",
        slug: "",
        categoryId: categories[0]?.id ?? "",
        description: "",
        composition: "",
        portion: "",
        weightGrams: "",
        volumeMl: "",
        kcal: "",
        proteins: "",
        fats: "",
        carbs: "",
        allergens: [],
        spiciness: "0",
        price: "",
        oldPrice: "",
        imageUrl: null,
        kanji: "",
        isHit: false,
        isNew: true,
        isVegan: false,
        isGlutenFree: false,
        isAvailable: true,
        groupIds: [],
      };
  return { dish, initial, categories, groups: groupOptions };
}
