import { Star } from "lucide-react";
import { connection } from "next/server";
import { SectionHeading } from "@/components/ui/Typography";
import { reviewsIntro } from "@/data/home";
import { cn } from "@/lib/cn";
import { getPublishedReviews, type PublishedReview } from "@/server/content";

const monthYear = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" });

/** «октябрь 2026»: без «г.» в конце. */
function reviewDate(iso: string | null) {
  return iso ? monthYear.format(new Date(iso)).replace(/\s?г\.$/, "") : null;
}

/** Опубликованные в админ-панели отзывы. Пока их нет — блока нет. */
export async function SiteReviews() {
  await connection();
  const items = await getPublishedReviews(6);
  return items.length ? <ReviewsSection items={items} /> : null;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-eyebrow" role="img" aria-label={`Оценка ${rating} из 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} aria-hidden="true" className={cn("size-2", i <= rating ? "fill-current" : "opacity-30")} />
      ))}
    </span>
  );
}

/** Отзывы на светлом фоне. Публикуются в админ-панели (раздел «Отзывы»). */
export function ReviewsSection({ items }: { items: PublishedReview[] }) {
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
                  <span className="font-semibold text-fg">{r.authorName}</span>
                  {r.publishedAt ? <span className="text-fg-muted">{reviewDate(r.publishedAt)}</span> : null}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
