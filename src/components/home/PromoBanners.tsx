import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { connection } from "next/server";
import { cn } from "@/lib/cn";
import { getActivePromotions } from "@/server/content";

/**
 * Баннеры из админ-панели (Маркетинг → «Баннер»): полоса над хитами на главной и над меню.
 * Нет активных баннеров — ничего не выводим.
 */
export async function PromoBanners({ className }: { className?: string }) {
  await connection();
  const banners = (await getActivePromotions()).filter((p) => p.kind === "BANNER");
  if (!banners.length) return null;
  return (
    <aside aria-label="Спецпредложения" className={cn("mx-auto w-full max-w-site px-2 md:px-3", className)}>
      <ul className="flex flex-col gap-1.5">
        {banners.map((b) => (
          <li
            key={b.id}
            className="relative flex items-center gap-2 overflow-hidden rounded-card border border-line bg-surface p-2 md:gap-3 md:p-3"
          >
            {b.imageUrl ? (
              <div className="relative hidden aspect-4/3 w-15 shrink-0 overflow-hidden rounded-sm bg-coal sm:block">
                <Image src={b.imageUrl} alt="" fill sizes="120px" className="object-cover" />
              </div>
            ) : b.kanji ? (
              <span aria-hidden="true" className="hidden shrink-0 font-kanji text-h1 text-ginger select-none sm:block">
                {b.kanji}
              </span>
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              {b.badge ? (
                <span className="text-xs font-semibold tracking-eyebrow text-eyebrow uppercase">{b.badge}</span>
              ) : null}
              <p className="text-title font-semibold text-fg">{b.title}</p>
              <p className="text-sm text-fg-muted">{b.text}</p>
            </div>
            {b.ctaHref && b.ctaLabel ? (
              <Link
                href={b.ctaHref}
                className="inline-flex min-h-5.5 shrink-0 items-center gap-1 self-end font-semibold text-fg underline-offset-4 after:absolute after:inset-0 hover:text-ginger hover:underline md:self-center"
              >
                {b.ctaLabel}
                <ArrowRight className="size-2" aria-hidden="true" />
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </aside>
  );
}
