import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getDishBySlug, getPairings } from "@/server/menu";
import { DishView } from "./DishView";

/** Загружает блюдо и «С этим берут» и рисует экран блюда. */
export async function DishLoader({
  slug,
  variant,
  titleId,
}: {
  slug: string;
  variant: "page" | "sheet";
  titleId?: string;
}) {
  const dish = await getDishBySlug(slug);
  if (!dish) notFound();
  const pairings = await getPairings(dish);
  const view = <DishView dish={dish} pairings={pairings} variant={variant} titleId={titleId} />;
  if (variant === "sheet") return view;
  return (
    <>
      <nav aria-label="Хлебные крошки" className="mb-2">
        <ol className="flex min-w-0 items-center gap-1 text-sm text-fg-muted">
          <li className="shrink-0">
            <Link href="/menu" className="inline-flex min-h-5.5 items-center hover:text-fg">
              Меню
            </Link>
          </li>
          <li aria-hidden="true" className="shrink-0">
            <ChevronRight className="size-2" />
          </li>
          <li className="shrink-0">
            <Link href={`/menu#cat-${dish.categorySlug}`} className="inline-flex min-h-5.5 items-center hover:text-fg">
              {dish.categoryName}
            </Link>
          </li>
          <li aria-hidden="true" className="shrink-0">
            <ChevronRight className="size-2" />
          </li>
          <li aria-current="page" className="truncate text-fg">
            {dish.name}
          </li>
        </ol>
      </nav>
      {view}
    </>
  );
}

export function DishSkeleton({ variant }: { variant: "page" | "sheet" }) {
  return (
    <div
      aria-busy="true"
      aria-label="Загружаем блюдо"
      className={variant === "page" ? "md:grid md:grid-cols-2 md:gap-6" : ""}
    >
      <div className={`aspect-4/3 animate-pulse bg-surface ${variant === "page" ? "rounded-card" : ""}`} />
      <div className="flex flex-col gap-2 p-2">
        <div className="h-3 w-1/4 rounded-full bg-surface" />
        <div className="h-5 w-3/4 rounded-sm bg-surface" />
        <div className="h-2 w-full rounded-sm bg-surface" />
        <div className="h-2 w-2/3 rounded-sm bg-surface" />
        <div className="h-6 w-full rounded-full bg-surface" />
      </div>
    </div>
  );
}
