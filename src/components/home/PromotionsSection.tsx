import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { connection } from "next/server";
import { Badge } from "@/components/ui/Badge";
import { SectionHeading } from "@/components/ui/Typography";
import { getActivePromotions, type ActivePromotion } from "@/server/content";

/** Акции из админ-панели (раздел «Маркетинг»). Нет активных акций — блока нет. */
export async function SitePromotions() {
  await connection();
  const items = (await getActivePromotions()).filter((p) => p.kind === "PROMO");
  return items.length ? <PromotionsSection items={items} /> : null;
}

export function PromotionsSection({ items }: { items: ActivePromotion[] }) {
  return (
    <section aria-labelledby="promo-title" className="pb-8 md:pb-12">
      <div data-reveal className="mx-auto flex max-w-site flex-col gap-4 px-2 md:px-3">
        <SectionHeading id="promo-title" eyebrow="Акции" title="Повод заказать сегодня" />
        <ul className="grid gap-2 md:grid-cols-3">
          {items.map((p) => (
            <li
              key={p.id}
              className="relative flex min-h-36 flex-col gap-1.5 overflow-hidden rounded-card border border-line bg-surface p-3"
            >
              {p.kanji ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-2 -bottom-4 font-kanji text-kanji-sm text-fg opacity-6 select-none"
                >
                  {p.kanji}
                </span>
              ) : null}
              {p.badge ? (
                <Badge tone="promo" className="self-start">
                  {p.badge}
                </Badge>
              ) : null}
              <h3 className="text-h3 font-semibold text-fg">{p.title}</h3>
              <p className="relative text-base text-fg-muted">{p.text}</p>
              {p.period ? (
                <p className="relative flex items-center gap-1 text-sm text-fg-muted">
                  <Clock className="size-2 text-ginger" aria-hidden="true" />
                  {p.period}
                </p>
              ) : null}
              {p.ctaHref && p.ctaLabel ? (
                <Link
                  href={p.ctaHref}
                  className="relative mt-auto inline-flex min-h-5.5 items-center gap-1 self-start pt-1 font-semibold text-fg underline-offset-4 hover:text-ginger hover:underline"
                >
                  {p.ctaLabel}
                  <ArrowRight className="size-2" aria-hidden="true" />
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
