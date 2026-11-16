"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { CartDishCard } from "@/components/site/CartDishCard";
import { DishImage } from "@/components/site/DishImage";
import { DishBadge, SpiceLevel } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Price } from "@/components/ui/Typography";
import { allergenLabels } from "@/lib/menu/allergens";
import { defaultSelection, groupRuleHint, unitPrice, validateModifierSelection } from "@/lib/menu/pricing";
import type { DishDetails, MenuDish, MenuModifierGroup } from "@/lib/menu/types";
import { cart } from "@/lib/cart/store";
import { cn } from "@/lib/cn";
import { formatRub } from "@/lib/money";

type DishViewProps = {
  dish: DishDetails;
  pairings: MenuDish[];
  /** page — отдельная страница (h1), sheet — шторка поверх меню (h2). */
  variant: "page" | "sheet";
  titleId?: string;
};

function formatNutrient(value: number | null, unit: string) {
  if (value == null) return "—";
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} ${unit}`;
}

function ModifierGroupField({
  group,
  selected,
  onToggle,
  error,
}: {
  group: MenuModifierGroup;
  selected: Set<string>;
  onToggle: (group: MenuModifierGroup, modifierId: string) => void;
  error?: string;
}) {
  const single = group.maxSelect === 1;
  const count = group.modifiers.filter((m) => selected.has(m.id)).length;
  const full = !single && count >= group.maxSelect;
  const hintId = useId();
  return (
    <fieldset className="flex flex-col gap-1" aria-describedby={hintId}>
      <legend className="flex w-full items-baseline justify-between gap-1 pb-1">
        <span className="text-title font-semibold text-fg">{group.name}</span>
        <span id={hintId} className={cn("text-sm", error ? "text-accent" : "text-fg-muted")}>
          {error ?? groupRuleHint(group)}
        </span>
      </legend>
      <ul className="flex flex-col divide-y divide-line rounded-card border border-line">
        {group.modifiers.map((m) => {
          const checked = selected.has(m.id);
          const disabled = !m.isAvailable || (full && !checked);
          return (
            <li key={m.id}>
              <label
                className={cn(
                  "flex min-h-6 cursor-pointer items-center gap-1.5 px-2 py-1",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <span className="relative inline-flex size-3 shrink-0">
                  <input
                    type={single ? "radio" : "checkbox"}
                    name={`group-${group.id}`}
                    checked={checked}
                    disabled={disabled}
                    onChange={() => onToggle(group, m.id)}
                    className={cn(
                      "peer size-3 cursor-pointer appearance-none border-2 border-line-strong bg-surface transition-colors duration-150 checked:border-action disabled:cursor-not-allowed",
                      single ? "rounded-full" : "rounded-xs checked:bg-action",
                    )}
                  />
                  {single ? (
                    <span className="pointer-events-none absolute inset-0 m-auto size-1.5 scale-0 rounded-full bg-action transition-transform duration-150 peer-checked:scale-100" />
                  ) : (
                    <Check
                      className="pointer-events-none absolute inset-0 m-auto size-2 text-on-action opacity-0 peer-checked:opacity-100"
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span className="flex-1 text-base text-fg">
                  {m.name}
                  {!m.isAvailable ? <span className="text-sm text-fg-muted"> — закончилось</span> : null}
                </span>
                <span className="text-sm text-fg-muted tabular-nums">
                  {m.price > 0 ? `+${formatRub(m.price)}` : "бесплатно"}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

export function DishView({ dish, pairings, variant, titleId }: DishViewProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(defaultSelection(dish.groups)));
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const soldOut = Boolean(dish.soldOut);

  const validation = useMemo(() => validateModifierSelection(dish.groups, [...selected]), [dish.groups, selected]);
  const chosen = validation.ok
    ? validation.modifiers
    : dish.groups.flatMap((g) =>
        g.modifiers.filter((m) => selected.has(m.id)).map((m) => ({ ...m, groupId: g.id, groupName: g.name })),
      );
  const portionPrice = unitPrice(dish.price, chosen);
  const errorsByGroup = new Map(
    validation.ok ? [] : validation.errors.filter((e) => e.groupId).map((e) => [e.groupId as string, e.message]),
  );

  const toggle = (group: MenuModifierGroup, id: string) => {
    setAdded(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (group.maxSelect === 1) {
        const wasChecked = next.has(id);
        group.modifiers.forEach((m) => next.delete(m.id));
        // Необязательную группу «один из» можно снять повторным нажатием.
        if (!wasChecked || group.minSelect > 0) next.add(id);
      } else if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const add = () => {
    if (!validation.ok) {
      setShowErrors(true);
      return;
    }
    cart.add({
      dishId: dish.id,
      slug: dish.slug,
      name: dish.name,
      unitPrice: portionPrice,
      imageUrl: dish.imageUrl,
      kanji: dish.kanji,
      modifiers: validation.modifiers.map(({ id, name, price }) => ({ id, name, price })),
      qty,
    });
    setAdded(true);
  };

  const Title = variant === "page" ? "h1" : "h2";
  /** Разделы — на уровень ниже заголовка блюда (на странице h2, в шторке h3). */
  const Section = variant === "page" ? "h2" : "h3";
  const nutrition = [
    ["Ккал", dish.kcal == null ? "—" : String(dish.kcal)],
    ["Белки", formatNutrient(dish.proteins, "г")],
    ["Жиры", formatNutrient(dish.fats, "г")],
    ["Углеводы", formatNutrient(dish.carbs, "г")],
  ] as const;

  return (
    <div className={cn(variant === "page" && "md:grid md:grid-cols-2 md:items-start md:gap-6")}>
      <div className={cn(variant === "page" && "md:sticky md:top-10")}>
        <DishImage
          name={dish.name}
          imageUrl={dish.imageUrl}
          kanji={dish.kanji}
          priority
          sizes={variant === "page" ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 640px, 100vw"}
          dimmed={soldOut}
          className={cn(variant === "page" ? "rounded-card" : "")}
        />
      </div>

      <div className={cn("flex flex-col gap-3", variant === "page" ? "pt-3 md:pt-0" : "px-2 pt-3 md:px-3")}>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-1">
            {soldOut ? <DishBadge.SoldOut /> : null}
            {dish.isHit ? <DishBadge.Hit /> : null}
            {dish.isNew ? <DishBadge.New /> : null}
            {dish.isVegan ? <DishBadge.Vegan /> : null}
            {dish.isGlutenFree ? <DishBadge.GlutenFree /> : null}
          </div>
          <Title id={titleId} className="font-display text-h2 text-fg">
            {dish.name}
          </Title>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
            <span>{dish.portion}</span>
            <SpiceLevel level={dish.spiciness} showZero withLabel />
          </p>
          <p className="text-lead text-fg-muted">{dish.description}</p>
          <Price value={dish.price} oldValue={dish.oldPrice} />
        </div>

        {dish.groups.length > 0 && !soldOut ? (
          <div className="flex flex-col gap-3">
            {dish.groups.map((g) => (
              <ModifierGroupField
                key={g.id}
                group={g}
                selected={selected}
                onToggle={toggle}
                error={showErrors ? errorsByGroup.get(g.id) : undefined}
              />
            ))}
          </div>
        ) : null}

        <div
          className={cn(
            "flex items-center gap-2 bg-canvas",
            // В шторке кнопка всегда под рукой; на странице стоит сразу после добавок.
            variant === "sheet"
              ? "sticky bottom-0 z-10 -mx-2 border-t border-line px-2 pt-2 pb-[max(16px,env(safe-area-inset-bottom))] md:-mx-3 md:px-3"
              : "py-1",
          )}
        >
          {soldOut ? (
            <p className="flex-1 text-base text-fg-muted" role="status">
              Закончилось на сегодня. Загляните в «С этим берут» ниже.
            </p>
          ) : (
            <>
              <QuantityStepper
                value={qty}
                min={1}
                onChange={(n) => {
                  setQty(n);
                  setAdded(false);
                }}
                itemName={dish.name}
                size="md"
              />
              <Button
                size="md"
                block
                onClick={add}
                icon={
                  added ? (
                    <Check className="size-2.5" aria-hidden="true" />
                  ) : (
                    <ShoppingBag className="size-2.5" aria-hidden="true" />
                  )
                }
              >
                <span className="tabular-nums">
                  {added ? "В корзине" : `Добавить · ${formatRub(portionPrice * qty)}`}
                </span>
              </Button>
            </>
          )}
        </div>
        {added ? (
          <Link
            href="/checkout"
            className="-mt-1 self-end text-sm font-semibold text-fg underline-offset-4 hover:underline"
          >
            Перейти к оформлению →
          </Link>
        ) : null}

        <section aria-labelledby={`${dish.id}-composition`} className="flex flex-col gap-1">
          <Section id={`${dish.id}-composition`} className="text-title font-semibold text-fg">
            Состав
          </Section>
          <p className="text-base text-fg-muted">{dish.composition}</p>
        </section>

        <section aria-labelledby={`${dish.id}-nutrition`} className="flex flex-col gap-1">
          <Section id={`${dish.id}-nutrition`} className="text-title font-semibold text-fg">
            Пищевая ценность на порцию
          </Section>
          <dl className="grid grid-cols-4 gap-1 rounded-card border border-line p-1.5 text-center">
            {nutrition.map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <dt className="text-xs text-fg-muted">{label}</dt>
                <dd className="text-base font-semibold text-fg tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby={`${dish.id}-allergens`} className="flex flex-col gap-1">
          <Section id={`${dish.id}-allergens`} className="text-title font-semibold text-fg">
            Аллергены
          </Section>
          {dish.allergens.length ? (
            <ul className="flex flex-wrap gap-1">
              {dish.allergens.map((a) => (
                <li
                  key={a}
                  className="inline-flex h-4 items-center rounded-full border border-line-strong px-1.5 text-sm text-fg"
                >
                  {allergenLabels[a]}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-fg-muted">Основных аллергенов нет.</p>
          )}
          <p className="text-sm text-fg-muted">Если у вас аллергия, предупредите нас в комментарии к заказу.</p>
        </section>

        {pairings.length ? (
          <section aria-labelledby={`${dish.id}-pairings`} className="flex flex-col gap-2 pb-3">
            <Section id={`${dish.id}-pairings`} className="text-title font-semibold text-fg">
              С этим берут
            </Section>
            <ul className="scrollbar-none -mx-2 flex snap-x snap-mandatory scroll-px-2 gap-2 overflow-x-auto px-2 md:-mx-3 md:scroll-px-3 md:px-3">
              {pairings.map((p) => (
                <li key={p.id} className="flex w-[70%] shrink-0 snap-start sm:w-[45%]">
                  <CartDishCard dish={p} className="w-full" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
