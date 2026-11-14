import type { Allergen } from "@/generated/prisma/enums";
import type { DishCardData } from "@/types/dish";

export type MenuModifier = { id: string; name: string; price: number; isAvailable: boolean };

export type MenuModifierGroup = {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  modifiers: MenuModifier[];
};

export type MenuDish = DishCardData & {
  categoryId: string;
  hasModifiers: boolean;
};

export type MenuCategory = {
  id: string;
  slug: string;
  name: string;
  kanji: string | null;
  dishes: MenuDish[];
};

export type DishDetails = MenuDish & {
  categoryName: string;
  categorySlug: string;
  composition: string;
  weightGrams: number | null;
  volumeMl: number | null;
  kcal: number | null;
  proteins: number | null;
  fats: number | null;
  carbs: number | null;
  allergens: Allergen[];
  groups: MenuModifierGroup[];
};
