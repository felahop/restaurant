import { CalendarDays } from "lucide-react";
import { Hanko } from "@/components/brand/Hanko";
import { KanjiBackdrop } from "@/components/brand/KanjiBackdrop";
import { PhotoFrame } from "@/components/site/PhotoFrame";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/Typography";
import { story } from "@/data/home";

/** История заведения на светлом фоне с фото кухни. */
export function StorySection() {
  return (
    <section aria-labelledby="story-title" className="theme-light relative overflow-hidden bg-canvas py-8 md:py-12">
      <KanjiBackdrop char="縁" className="-top-6 -left-6 hidden md:block" />
      <div
        data-reveal
        className="relative mx-auto grid max-w-site items-center gap-5 px-2 md:grid-cols-2 md:gap-8 md:px-3"
      >
        <div className="flex flex-col gap-3">
          <SectionHeading id="story-title" eyebrow={story.eyebrow} title={story.title} />
          {story.paragraphs.map((p) => (
            <p key={p.slice(0, 24)} className="text-lead text-fg-muted">
              {p}
            </p>
          ))}
          <dl className="grid grid-cols-3 gap-2 border-t border-line pt-3">
            {story.facts.map((f) => (
              <div key={f.label} className="flex flex-col gap-0.5">
                <dt className="order-2 text-sm text-fg-muted">{f.label}</dt>
                <dd className="order-1 font-display text-h3 text-fg">{f.value}</dd>
              </div>
            ))}
          </dl>
          <div className="pt-1">
            <ButtonLink href="/booking" icon={<CalendarDays className="size-2.5" aria-hidden="true" />}>
              Забронировать стол
            </ButtonLink>
          </div>
        </div>
        <div className="relative">
          <PhotoFrame image={story.image} caption={story.imageCaption} kanji="火" aspect="aspect-4/5" />
          <Hanko className="absolute -top-3 -right-1 size-10 -rotate-8 md:-right-4 md:size-12" />
        </div>
      </div>
    </section>
  );
}
