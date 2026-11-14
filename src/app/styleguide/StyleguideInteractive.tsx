"use client";

import { useState } from "react";
import { DishCard, DishCardSkeleton } from "@/components/site/DishCard";
import { Header } from "@/components/site/Header";
import { MobileCartBar } from "@/components/site/MobileCartBar";
import { PhoneField } from "@/components/ui/PhoneField";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { SegmentedControl } from "@/components/ui/Choice";
import { Eyebrow } from "@/components/ui/Typography";
import { demoDishes } from "@/data/demo-dishes";
import type { DishCardData } from "@/types/dish";

/** Карточки блюд с живой корзиной: добавление, степпер, «прыжок» счётчика в шапке. */
export function DishCardsDemo() {
  const [cart, setCart] = useState<Record<string, number>>({ d4: 2 });

  const setQty = (dish: DishCardData, next: number) =>
    setCart((prev) => {
      const copy = { ...prev };
      if (next <= 0) delete copy[dish.id];
      else copy[dish.id] = next;
      return copy;
    });

  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const total = demoDishes.reduce((sum, d) => sum + (cart[d.id] ?? 0) * d.price, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-card border border-line">
        <Header cartCount={count} cartTotal={total} />
      </div>
      <p className="text-sm text-fg-muted">
        Шапка выше связана с карточками: добавьте блюдо, и счётчик корзины «подпрыгнет».
      </p>
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {demoDishes.map((dish, i) => (
          <DishCard
            key={dish.id}
            dish={dish}
            quantity={cart[dish.id] ?? 0}
            priority={i < 2}
            onAdd={(d) => setQty(d, 1)}
            onQuantityChange={setQty}
          />
        ))}
        <DishCardSkeleton />
      </div>
      <div className="flex max-w-narrow flex-col gap-1">
        <Eyebrow>Нижняя полоса корзины (телефон)</Eyebrow>
        <MobileCartBar count={count || 3} total={total || 187_000} preview />
      </div>
    </div>
  );
}

export function ControlsDemo() {
  const [mode, setMode] = useState<"delivery" | "pickup">("delivery");
  const [qty, setQty] = useState(1);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="flex flex-col gap-1">
        <Eyebrow>Переключатель</Eyebrow>
        <SegmentedControl
          name="sg-mode"
          legend="Способ получения"
          value={mode}
          onChange={setMode}
          options={[
            { value: "delivery", label: "Доставка" },
            { value: "pickup", label: "Самовывоз" },
          ]}
        />
        <p className="text-sm text-fg-muted">Выбрано: {mode === "delivery" ? "доставка" : "самовывоз"}</p>
      </div>
      <div className="flex flex-col gap-1">
        <Eyebrow>Количество</Eyebrow>
        <div className="flex items-center gap-2">
          <QuantityStepper value={qty} onChange={setQty} min={1} itemName="Тонкоцу рамен" />
          <QuantityStepper value={qty} onChange={setQty} min={1} itemName="Тонкоцу рамен (крупный)" size="md" />
        </div>
      </div>
      <PhoneField id="sg-phone" hint="Пришлём код для входа и статус заказа" />
      <PhoneField id="sg-phone-error" defaultValue="+7 999 12" error="Проверьте номер: не хватает цифр" />
    </div>
  );
}
