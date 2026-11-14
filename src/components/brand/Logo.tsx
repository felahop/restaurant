import Link from "next/link";
import { restaurant } from "@/config/restaurant";
import { cn } from "@/lib/cn";
import { Hanko } from "./Hanko";

export function Logo({ className, withTagline = false }: { className?: string; withTagline?: boolean }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex min-h-5.5 items-center gap-1.5 rounded-sm", className)}
      aria-label={`${restaurant.name} — на главную`}
    >
      <Hanko className="size-5" />
      <span className="flex flex-col">
        <span className="font-display text-title leading-tight tracking-tight text-fg">{restaurant.name}</span>
        {withTagline ? <span className="text-2xs text-fg-muted">{restaurant.tagline}</span> : null}
      </span>
    </Link>
  );
}
