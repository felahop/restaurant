"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Flame, Leaf, Search, SearchX, Sparkles, Star, WheatOff, X } from "lucide-react";
import { CartDishCard } from "@/components/site/CartDishCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { MenuCategory, MenuDish } from "@/lib/menu/types";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/money";

const FILTERS = [
  { key: "spicy", label: "Острое", Icon: Flame, test: (d: MenuDish) => d.spiciness > 0 },
  { key: "vegan", label: "Веган", Icon: Leaf, test: (d: MenuDish) => Boolean(d.isVegan) },
  { key: "glutenFree", label: "Без глютена", Icon: WheatOff, test: (d: MenuDish) => Boolean(d.isGlutenFree) },
  { key: "hit", label: "Хиты", Icon: Star, test: (d: MenuDish) => Boolean(d.isHit) },
  { key: "new", label: "Новинки", Icon: Sparkles, test: (d: MenuDish) => Boolean(d.isNew) },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const normalize = (s: string) => s.toLowerCase().replace(/ё/g, "е").trim();

function sectionId(slug: string) {
  return `cat-${slug}`;
}

export function MenuBrowser({ categories }: { categories: MenuCategory[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Set<FilterKey>>(new Set());
  const [current, setCurrent] = useState<string | null>(categories[0]?.slug ?? null);
  const navRef = useRef<HTMLDivElement>(null);
  /** Пока страница прокручивается к выбранной категории, подсветку не перебиваем. */
  const clickLock = useRef(false);
  const lockTimer = useRef<number | undefined>(undefined);

  const visible = useMemo(() => {
    const q = normalize(query);
    const tests = FILTERS.filter((f) => active.has(f.key)).map((f) => f.test);
    return categories
      .map((c) => ({
        ...c,
        dishes: c.dishes.filter(
          (d) => (!q || normalize(`${d.name} ${d.description}`).includes(q)) && tests.every((test) => test(d)),
        ),
      }))
      .filter((c) => c.dishes.length > 0);
  }, [categories, query, active]);

  const total = visible.reduce((n, c) => n + c.dishes.length, 0);
  const filtering = query.trim() !== "" || active.size > 0;
  const visibleKey = visible.map((c) => c.slug).join("|");

  // Подсветка текущей категории при прокрутке: последняя секция, чей верх прошёл под липкую ленту.
  useEffect(() => {
    const OFFSET = 160; // шапка 64 px + лента категорий ~64 px + запас
    let frame = 0;
    const update = () => {
      frame = 0;
      if (clickLock.current) return;
      let next: string | null = visible[0]?.slug ?? null;
      for (const c of visible) {
        const el = document.getElementById(sectionId(c.slug));
        if (el && el.getBoundingClientRect().top <= OFFSET) next = c.slug;
      }
      setCurrent(next);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- пересчитываем только при смене набора секций
  }, [visibleKey]);

  // Активная категория всегда видна в ленте категорий.
  useEffect(() => {
    const nav = navRef.current;
    const chip = nav?.querySelector<HTMLElement>(`[data-slug="${current}"]`);
    if (!nav || !chip) return;
    const left = chip.offsetLeft - nav.clientWidth / 2 + chip.clientWidth / 2;
    nav.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [current]);

  const goTo = (slug: string) => {
    setCurrent(slug);
    clickLock.current = true;
    window.clearTimeout(lockTimer.current);
    lockTimer.current = window.setTimeout(() => {
      clickLock.current = false;
    }, 800);
    const el = document.getElementById(sectionId(slug));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  const toggle = (key: FilterKey) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const reset = () => {
    setQuery("");
    setActive(new Set());
  };

  return (
    <div>
      <div className="mx-auto flex max-w-site flex-col gap-2 px-2 pb-2 md:px-3">
        <div className="relative max-w-60">
          <label htmlFor="menu-search" className="sr-only">
            Поиск по меню
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-2 size-2.5 -translate-y-1/2 text-fg-muted"
            aria-hidden="true"
          />
          <input
            id="menu-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Рамен, креветки, тофу…"
            autoComplete="off"
            className="h-6 w-full rounded-full border border-line-strong bg-surface pr-6 pl-6 text-base text-fg placeholder:text-fg-muted hover:border-fg-muted focus-visible:border-focus focus-visible:outline-2 focus-visible:outline-offset-0"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Очистить поиск"
              className="absolute top-1/2 right-0.5 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-fg-muted hover:text-fg"
            >
              <X className="size-2" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div
          role="group"
          aria-label="Фильтры"
          className="scrollbar-none -mx-2 flex gap-1 overflow-x-auto px-2 md:mx-0 md:flex-wrap md:px-0"
        >
          {FILTERS.map(({ key, label, Icon }) => {
            const pressed = active.has(key);
            return (
              <button
                key={key}
                type="button"
                aria-pressed={pressed}
                onClick={() => toggle(key)}
                className={cn(
                  "inline-flex h-5.5 shrink-0 items-center gap-1 rounded-full border px-2 text-sm font-semibold transition-colors duration-150",
                  pressed ? "border-fg bg-fg text-canvas" : "border-line-strong text-fg hover:border-fg",
                )}
              >
                <Icon className="size-2" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <nav aria-label="Категории меню" className="sticky top-8 z-30 border-y border-line bg-canvas">
        <div ref={navRef} className="scrollbar-none mx-auto flex max-w-site gap-1 overflow-x-auto px-2 py-1 md:px-3">
          {visible.map((c) => {
            const isCurrent = c.slug === current;
            return (
              <a
                key={c.slug}
                href={`#${sectionId(c.slug)}`}
                data-slug={c.slug}
                aria-current={isCurrent ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  goTo(c.slug);
                }}
                className={cn(
                  "inline-flex h-5.5 shrink-0 items-center rounded-full px-2 text-sm font-semibold whitespace-nowrap transition-colors duration-150",
                  isCurrent ? "bg-fg text-canvas" : "text-fg-muted hover:text-fg",
                )}
              >
                {c.name}
              </a>
            );
          })}
        </div>
      </nav>

      <p className="sr-only" role="status" aria-live="polite">
        {filtering ? `Найдено ${total} ${plural(total, ["блюдо", "блюда", "блюд"])}` : ""}
      </p>

      <div className="mx-auto flex max-w-site flex-col gap-6 px-2 py-4 md:gap-8 md:px-3 md:py-6">
        {visible.length === 0 ? (
          <EmptyState
            icon={<SearchX className="size-3" aria-hidden="true" />}
            title="Ничего не нашли"
            action={
              <Button variant="secondary" onClick={reset}>
                Сбросить поиск и фильтры
              </Button>
            }
          >
            Попробуйте другое слово или уберите часть фильтров.
          </EmptyState>
        ) : (
          visible.map((c) => (
            <section
              key={c.slug}
              id={sectionId(c.slug)}
              aria-labelledby={`${sectionId(c.slug)}-title`}
              className="scroll-mt-1"
            >
              <h2
                id={`${sectionId(c.slug)}-title`}
                className="mb-2 flex items-baseline gap-1.5 font-display text-h2 text-fg"
              >
                {c.name}
                <span className="font-sans text-sm font-regular text-fg-muted">
                  {c.dishes.length} {plural(c.dishes.length, ["блюдо", "блюда", "блюд"])}
                </span>
              </h2>
              <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {c.dishes.map((dish) => (
                  <li key={dish.id} className="flex">
                    <CartDishCard dish={dish} className="w-full" />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
