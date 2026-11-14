export type SpiceLevelValue = 0 | 1 | 2 | 3;

/** Данные для карточки блюда в списках (главная, меню). Деньги — в копейках. */
export type DishCardData = {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Выход порции: «350 г», «400 мл», «6 шт · 180 г». */
  portion: string;
  price: number;
  oldPrice?: number | null;
  imageUrl?: string | null;
  /** Иероглиф для заглушки без фото (из подмножества шрифта). */
  kanji?: string | null;
  isHit?: boolean;
  isNew?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  spiciness: SpiceLevelValue;
  soldOut?: boolean;
  /** Есть обязательный выбор (например, основа для вока): быстрое добавление недоступно, открываем блюдо. */
  requiresChoice?: boolean;
};
