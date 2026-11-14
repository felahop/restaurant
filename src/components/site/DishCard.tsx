"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { DishCardData } from "@/types/dish";
import { Button } from "@/components/ui/Button";
import { DishBadge, SpiceLevel } from "@/components/ui/Badge";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Price } from "@/components/ui/Typography";
import { cn } from "@/lib/cn";
import { DishImage } from "./DishImage";

type DishCardProps = {
  dish: DishCardData;
  /** Сколько порций уже в корзине: при > 0 вместо кнопки показываем степпер. */
  quantity?: number;
  onAdd?: (dish: DishCardData) => void;
  onQuantityChange?: (dish: DishCardData, next: number) => void;
  priority?: boolean;
  headingLevel?: "h2" | "h3";
  className?: string;
};

export function DishCard({
  dish,
  quantity = 0,
  onAdd,
  onQuantityChange,
  priority,
  headingLevel: Heading = "h3",
  className,
}: DishCardProps) {
  const soldOut = Boolean(dish.soldOut);
  const href = `/menu/${dish.slug}`;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-card bg-surface transition-colors duration-200 hover:bg-surface-2/60",
        className,
      )}
    >
      <div className="relative">
        <DishImage name={dish.name} imageUrl={dish.imageUrl} kanji={dish.kanji} priority={priority} dimmed={soldOut} />
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {soldOut ? <DishBadge.SoldOut /> : null}
          {!soldOut && dish.isHit ? <DishBadge.Hit /> : null}
          {!soldOut && dish.isNew ? <DishBadge.New /> : null}
          {dish.isVegan ? <DishBadge.Vegan /> : null}
          {dish.isGlutenFree ? <DishBadge.GlutenFree /> : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-2">
        <div className="flex items-start justify-between gap-1">
          <Heading className="text-title font-semibold text-fg">
            {/* Растянутая ссылка: вся карточка кликабельна, кнопки лежат поверх. */}
            <Link href={href} className="rounded-xs after:absolute after:inset-0 after:content-['']">
              {dish.name}
            </Link>
          </Heading>
          <SpiceLevel level={dish.spiciness} className="mt-0.5 shrink-0" />
        </div>
        <p className="line-clamp-2 text-sm text-fg-muted">{dish.description}</p>
        <p className="text-sm text-fg-muted">{dish.portion}</p>

        <div className="mt-auto flex min-h-6 items-center justify-between gap-1 pt-1">
          <Price value={dish.price} oldValue={dish.oldPrice} />
          <div className="relative z-10">
            {soldOut ? (
              <Button size="sm" variant="ghost" disabled aria-label={`${dish.name} закончилось`}>
                Нет в наличии
              </Button>
            ) : quantity > 0 ? (
              <QuantityStepper
                value={quantity}
                itemName={dish.name}
                onChange={(next) => onQuantityChange?.(dish, next)}
              />
            ) : (
              <Button
                size="sm"
                icon={<Plus className="size-2" aria-hidden="true" />}
                onClick={() => onAdd?.(dish)}
                aria-label={`Добавить в корзину: ${dish.name}`}
              >
                В корзину
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/** Скелетон карточки на время загрузки. */
export function DishCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-card bg-surface" aria-hidden="true">
      <div className="aspect-4/3 animate-pulse bg-surface-2" />
      <div className="flex flex-col gap-1.5 p-2">
        <div className="h-2.5 w-3/4 rounded-sm bg-surface-2" />
        <div className="h-2 w-full rounded-sm bg-surface-2" />
        <div className="h-2 w-1/3 rounded-sm bg-surface-2" />
        <div className="mt-1 flex items-center justify-between">
          <div className="h-3 w-10 rounded-sm bg-surface-2" />
          <div className="h-5.5 w-14 rounded-full bg-surface-2" />
        </div>
      </div>
    </div>
  );
}
