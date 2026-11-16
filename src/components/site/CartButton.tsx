import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatRub, plural } from "@/lib/money";

type CartButtonProps = { count: number; total: number; className?: string };

/**
 * Кнопка корзины в шапке. Счётчик «подпрыгивает» при изменении (ключ = количество).
 * Имя ссылки собирается из видимых цифр и скрытых слов: «Корзина: 2 блюда на 1 380 ₽» (WCAG 2.5.3 — видимое входит в имя).
 */
export function CartButton({ count, total, className }: CartButtonProps) {
  return (
    <Link
      href="/checkout"
      className={cn(
        "relative inline-flex h-5.5 items-center gap-1 rounded-full px-1.5 text-fg transition-colors duration-150 hover:bg-surface-2",
        className,
      )}
    >
      <span className="sr-only">{count > 0 ? "Корзина: " : "Корзина пуста"}</span>
      <span className="relative inline-flex">
        <ShoppingBag className="size-3" aria-hidden="true" />
        {count > 0 ? (
          <span
            key={count}
            className="absolute -top-1 -right-1 inline-flex h-2.5 min-w-2.5 animate-bump items-center justify-center rounded-full bg-action px-0.5 text-2xs font-semibold text-on-action tabular-nums"
          >
            {count}
          </span>
        ) : null}
      </span>
      {count > 0 ? (
        <>
          <span className="sr-only"> {plural(count, ["блюдо", "блюда", "блюд"])} на </span>
          {/* На узком экране сумма видна только скринридеру (sr-only), с lg — всем. */}
          <span className="sr-only text-sm font-semibold tabular-nums lg:not-sr-only">{formatRub(total)}</span>
        </>
      ) : null}
    </Link>
  );
}
