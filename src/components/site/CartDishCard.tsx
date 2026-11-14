"use client";

import { cart, lineKey, useCart } from "@/lib/cart/store";
import type { DishCardData } from "@/types/dish";
import { DishCard } from "./DishCard";

type Props = {
  dish: DishCardData;
  priority?: boolean;
  headingLevel?: "h2" | "h3";
  className?: string;
};

/** Карточка блюда с быстрым добавлением в корзину (без добавок). */
export function CartDishCard({ dish, ...rest }: Props) {
  const { qtyOfLine } = useCart();
  const key = lineKey(dish.id);
  return (
    <DishCard
      {...rest}
      dish={dish}
      quantity={qtyOfLine(key)}
      onAdd={(d) =>
        cart.add({ dishId: d.id, slug: d.slug, name: d.name, unitPrice: d.price, imageUrl: d.imageUrl, kanji: d.kanji })
      }
      onQuantityChange={(_, next) => cart.setQty(key, next)}
    />
  );
}
