import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { formatRub, plural } from "@/lib/money";

type MobileCartBarProps = {
  count: number;
  total: number;
  /** Для витрины: показать полосу в потоке, а не закреплённой. */ preview?: boolean;
};

/** Корзина, закреплённая внизу экрана на телефоне. Скрыта, если корзина пуста. */
export function MobileCartBar({ count, total, preview = false }: MobileCartBarProps) {
  if (count <= 0) return null;
  return (
    <>
      {/* Отступ, чтобы полоса не перекрывала низ страницы. */}
      {preview ? null : <div className="h-10 md:hidden" aria-hidden="true" />}
      <div
        className={
          preview
            ? "rounded-card border border-line bg-surface p-1"
            : "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-2 pt-1 pb-[max(8px,env(safe-area-inset-bottom))] shadow-bar md:hidden"
        }
      >
        <Link
          href="/checkout"
          className="flex h-6 items-center justify-between gap-2 rounded-full bg-action px-2.5 font-semibold text-on-action transition-colors duration-150 hover:bg-action-hover active:translate-y-px"
        >
          <span className="inline-flex items-center gap-1">
            <ShoppingBag className="size-2.5" aria-hidden="true" />
            <span key={count} className="inline-block animate-bump tabular-nums">
              {count} {plural(count, ["блюдо", "блюда", "блюд"])}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            {formatRub(total)}
            <span aria-hidden="true">→</span>
          </span>
        </Link>
      </div>
    </>
  );
}
