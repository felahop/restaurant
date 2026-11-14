import type { ReactNode } from "react";
import { Flame, Leaf, Sparkles, Star, WheatOff } from "lucide-react";
import { cn } from "@/lib/cn";

export type BadgeTone = "hit" | "new" | "vegan" | "glutenFree" | "soldOut" | "promo" | "neutral" | "success";

const tones: Record<BadgeTone, string> = {
  hit: "bg-ginger text-ink",
  new: "bg-paper text-ink",
  vegan: "bg-matcha text-ink",
  glutenFree: "border border-line-strong bg-canvas text-fg",
  soldOut: "bg-ash text-paper",
  promo: "bg-ginger text-ink",
  neutral: "border border-line-strong text-fg",
  success: "bg-matcha text-ink",
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-3 items-center gap-0.5 rounded-full px-1 text-2xs font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

const iconCls = "size-1.5 shrink-0";

/** Готовые метки блюд. */
export const DishBadge = {
  Hit: () => (
    <Badge tone="hit" icon={<Star className={iconCls} aria-hidden="true" />}>
      Хит
    </Badge>
  ),
  New: () => (
    <Badge tone="new" icon={<Sparkles className={iconCls} aria-hidden="true" />}>
      Новинка
    </Badge>
  ),
  Vegan: () => (
    <Badge tone="vegan" icon={<Leaf className={iconCls} aria-hidden="true" />}>
      Веган
    </Badge>
  ),
  GlutenFree: () => (
    <Badge tone="glutenFree" icon={<WheatOff className={iconCls} aria-hidden="true" />}>
      Без глютена
    </Badge>
  ),
  SoldOut: () => <Badge tone="soldOut">Закончилось</Badge>,
};

const spiceLabels = ["Не острое", "Слегка острое", "Острое", "Очень острое"] as const;

/** Острота 0–3: огоньки цвета ginger. 0 — ничего не показываем, если не просят явно. */
export function SpiceLevel({
  level,
  showZero = false,
  withLabel = false,
  className,
}: {
  level: 0 | 1 | 2 | 3;
  showZero?: boolean;
  withLabel?: boolean;
  className?: string;
}) {
  if (level === 0 && !showZero) return null;
  const label = spiceLabels[level];
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-ginger", className)} title={label}>
      <span className="sr-only">{label}</span>
      {[1, 2, 3].map((i) => (
        <Flame key={i} aria-hidden="true" className={cn("size-2", i <= level ? "fill-current" : "opacity-30")} />
      ))}
      {withLabel ? <span className="ml-0.5 text-sm text-fg-muted">{label}</span> : null}
    </span>
  );
}
