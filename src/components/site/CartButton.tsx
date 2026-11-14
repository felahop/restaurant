import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatRub, plural } from "@/lib/money";

type CartButtonProps = { count: number; total: number; className?: string };

/** Кнопка корзины в шапке. Счётчик «подпрыгивает» при изменении (ключ = количество). */
export function CartButton({ count, total, className }: CartButtonProps) {
  const label =
    count > 0
      ? `Корзина: ${count} ${plural(count, ["блюдо", "блюда", "блюд"])} на ${formatRub(total)}`
      : "Корзина пуста";
  return (
    <Link
      href="/checkout"
      aria-label={label}
      className={cn(
        "relative inline-flex h-5.5 items-center gap-1 rounded-full px-1.5 text-fg transition-colors duration-150 hover:bg-surface-2",
        className,
      )}
    >
      <span className="relative inline-flex">
        <ShoppingBag className="size-3" aria-hidden="true" />
        {count > 0 ? (
          <span
            key={count}
            className="absolute -top-1 -right-1 inline-flex h-2.5 min-w-2.5 animate-bump items-center justify-center rounded-full bg-action px-0.5 text-2xs font-semibold text-on-action tabular-nums"
            aria-hidden="true"
          >
            {count}
          </span>
        ) : null}
      </span>
      {count > 0 ? (
        <span className="hidden text-sm font-semibold tabular-nums lg:inline" aria-hidden="true">
          {formatRub(total)}
        </span>
      ) : null}
    </Link>
  );
}
