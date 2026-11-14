import { Star } from "lucide-react";
import { SectionHeading } from "@/components/ui/Typography";
import type { Review } from "@/data/home";
import { reviewsIntro } from "@/data/home";
import { cn } from "@/lib/cn";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-eyebrow" role="img" aria-label={`Оценка ${rating} из 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} aria-hidden="true" className={cn("size-2", i <= rating ? "fill-current" : "opacity-30")} />
      ))}
    </span>
  );
}

/** Отзывы на светлом фоне. Публикуются из админ-панели (этап 7). */
export function ReviewsSection({ items }: { items: Review[] }) {
  return (
    <section aria-labelledby="reviews-title" className="theme-light bg-canvas py-8 md:py-12">
      <div data-reveal className="mx-auto flex max-w-site flex-col gap-4 px-2 md:px-3">
        <SectionHeading id="reviews-title" eyebrow={reviewsIntro.eyebrow} title={reviewsIntro.title} />
        <ul className="grid gap-2 md:grid-cols-3">
          {items.map((r) => (
            <li key={r.id}>
              <figure className="flex h-full flex-col gap-2 rounded-card bg-surface p-3 shadow-soft">
                <Stars rating={r.rating} />
                <blockquote className="flex-1 text-lead text-fg">
                  <p>«{r.text}»</p>
                </blockquote>
                <figcaption className="flex items-baseline justify-between gap-1 border-t border-line pt-2 text-sm">
                  <span className="font-semibold text-fg">{r.author}</span>
                  <span className="text-fg-muted">{r.date}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
