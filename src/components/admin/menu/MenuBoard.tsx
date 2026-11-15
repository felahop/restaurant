"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { formatRub } from "@/lib/money";
import {
  deleteDishAction,
  duplicateDishAction,
  reorderDishesAction,
  toggleAvailabilityAction,
} from "@/app/admin/(panel)/menu/actions";
import { SortableList } from "./SortableList";

type BoardDish = { id: string; name: string; slug: string; price: number; isAvailable: boolean; isHit: boolean; isNew: boolean; portion: string };
type BoardCategory = { id: string; name: string; isHidden: boolean; dishes: BoardDish[] };

export function MenuBoard({ categories }: { categories: BoardCategory[] }) {
  const router = useRouter();
  const [state, setState] = useState(categories);
  const [source, setSource] = useState(categories);
  // Свежие данные с сервера (после копирования, удаления) заменяют локальное состояние.
  if (source !== categories) {
    setSource(categories);
    setState(categories);
  }
  const [message, setMessage] = useState<string | null>(null);
  const [, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, refresh = true) =>
    start(async () => {
      const res = await fn();
      setMessage(res.ok ? (res.message ?? "Готово") : (res.error ?? "Ошибка"));
      if (refresh) router.refresh();
    });

  const setDishes = (categoryId: string, dishes: BoardDish[]) =>
    setState((prev) => prev.map((c) => (c.id === categoryId ? { ...c, dishes } : c)));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-1">
        <p role="status" aria-live="polite" className="min-h-2.5 text-sm text-fg-muted">
          {message ?? "Перетаскивайте блюда за ручку, чтобы поменять порядок в меню."}
        </p>
        <ButtonLink href="/admin/menu/dishes/new" size="sm" icon={<Plus className="size-2" aria-hidden="true" />}>
          Новое блюдо
        </ButtonLink>
      </div>
      {state.map((c) => (
        <section key={c.id} aria-labelledby={`cat-${c.id}`} className="rounded-card border border-line bg-surface">
          <h2 id={`cat-${c.id}`} className="flex items-center gap-1 border-b border-line px-2 py-1 text-title font-semibold">
            {c.name}
            <span className="text-sm font-regular text-fg-muted">{c.dishes.length}</span>
            {c.isHidden ? (
              <Badge tone="neutral" icon={<EyeOff className="size-1.5" aria-hidden="true" />}>
                скрыта
              </Badge>
            ) : null}
          </h2>
          {c.dishes.length === 0 ? (
            <p className="px-2 py-2 text-sm text-fg-muted">Блюд пока нет.</p>
          ) : (
            <SortableList
              label={`Блюда категории «${c.name}»`}
              items={c.dishes}
              onReorder={(next) => {
                setDishes(c.id, next);
                run(() => reorderDishesAction(c.id, next.map((d) => d.id)), false);
              }}
              renderItem={(d, handle) => (
                <div className="flex flex-wrap items-center gap-1 px-1 py-1 sm:flex-nowrap">
                  {handle}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/admin/menu/dishes/${d.id}`} className="truncate text-base font-semibold text-fg hover:underline">
                      {d.name}
                    </Link>
                    <span className="text-sm text-fg-muted">
                      {formatRub(d.price)} · {d.portion}
                      {d.isHit ? " · хит" : ""}
                      {d.isNew ? " · новинка" : ""}
                    </span>
                  </div>
                  <Switch
                    checked={d.isAvailable}
                    label={d.isAvailable ? "В продаже" : "Стоп-лист"}
                    aria-label={`В продаже: ${d.name}`}
                    onCheckedChange={(next) => {
                      setDishes(
                        c.id,
                        c.dishes.map((x) => (x.id === d.id ? { ...x, isAvailable: next } : x)),
                      );
                      run(() => toggleAvailabilityAction(d.id, next), false);
                    }}
                  />
                  <div className="flex">
                    <Link
                      href={`/admin/menu/dishes/${d.id}`}
                      aria-label={`Редактировать: ${d.name}`}
                      className="inline-flex size-5.5 items-center justify-center rounded-full hover:bg-surface-2"
                    >
                      <Pencil className="size-2" aria-hidden="true" />
                    </Link>
                    <IconButton label={`Копировать: ${d.name}`} onClick={() => run(() => duplicateDishAction(d.id))}>
                      <Copy className="size-2" aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label={`Удалить: ${d.name}`}
                      onClick={() => {
                        if (window.confirm(`Удалить «${d.name}» из меню? В старых заказах блюдо останется.`)) {
                          run(() => deleteDishAction(d.id));
                        }
                      }}
                    >
                      <Trash2 className="size-2" aria-hidden="true" />
                    </IconButton>
                  </div>
                </div>
              )}
            />
          )}
        </section>
      ))}
    </div>
  );
}
