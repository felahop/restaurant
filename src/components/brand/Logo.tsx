import Link from "next/link";
import { restaurant } from "@/config/restaurant";
import { cn } from "@/lib/cn";
import { Hanko } from "./Hanko";

export function Logo({ className, withTagline = false }: { className?: string; withTagline?: boolean }) {
  return (
    <Link href="/" className={cn("inline-flex min-h-5.5 items-center gap-1.5 rounded-sm", className)}>
      <Hanko className="size-5" />
      <span className="flex flex-col">
        <span className="font-display text-title leading-tight tracking-tight text-fg">{restaurant.name}</span>
        {withTagline ? <span className="text-2xs text-fg-muted">{restaurant.tagline}</span> : null}
      </span>
      {/* Видимый текст входит в имя ссылки (WCAG 2.5.3), назначение — для скринридеров. */}
      <span className="sr-only">, на главную</span>
    </Link>
  );
}
