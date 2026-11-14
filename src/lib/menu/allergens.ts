import type { Allergen } from "@/generated/prisma/enums";

/** Подписи аллергенов для гостей. */
export const allergenLabels: Record<Allergen, string> = {
  GLUTEN: "Глютен",
  CRUSTACEANS: "Ракообразные",
  EGGS: "Яйца",
  FISH: "Рыба",
  PEANUTS: "Арахис",
  SOY: "Соя",
  MILK: "Молоко",
  TREE_NUTS: "Орехи",
  CELERY: "Сельдерей",
  MUSTARD: "Горчица",
  SESAME: "Кунжут",
  SULPHITES: "Сульфиты",
  MOLLUSCS: "Моллюски",
};
