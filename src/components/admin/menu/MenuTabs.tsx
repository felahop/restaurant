import Link from "next/link";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/admin/menu", label: "Блюда" },
  { href: "/admin/menu/categories", label: "Категории" },
  { href: "/admin/menu/modifiers", label: "Добавки" },
] as const;

export function MenuTabs({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label="Разделы меню" className="flex gap-0.5 border-b border-line">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.href === active ? "page" : undefined}
          className={cn(
            "-mb-px inline-flex min-h-5.5 items-center border-b-2 px-1.5 text-sm font-semibold",
            t.href === active ? "border-ink text-fg" : "border-transparent text-fg-muted hover:text-fg",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
