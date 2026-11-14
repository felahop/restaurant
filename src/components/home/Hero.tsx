import Image from "next/image";
import { CalendarDays, ShoppingBag } from "lucide-react";
import { HeroArt } from "@/components/brand/HeroArt";
import { KanjiBackdrop } from "@/components/brand/KanjiBackdrop";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Typography";
import { hero } from "@/data/home";

/**
 * Первый экран: фото на всю ширину (4:5 на телефоне, 16:9 на десктопе), слоган и две кнопки.
 * Пока фото нет — фирменная иллюстрация на тёмном фоне с тёплым свечением углей.
 */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <div className="relative aspect-4/5 w-full md:aspect-16/9 md:max-h-[calc(100svh-104px)] md:min-h-75">
        {hero.image ? (
          <Image src={hero.image.src} alt={hero.image.alt} fill priority sizes="100vw" className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_62%_38%,color-mix(in_oklab,var(--color-ginger)_16%,transparent)_0%,transparent_58%)]">
            <KanjiBackdrop char="火" className="top-[-6%] left-[-8%] md:top-auto md:bottom-[-14%] md:left-[30%]" />
            <HeroArt className="absolute top-[4%] left-1/2 w-[92%] -translate-x-1/2 md:top-1/2 md:right-[4%] md:left-auto md:w-[46%] md:max-w-85 md:translate-x-0 md:-translate-y-1/2" />
          </div>
        )}
        {/* Затемнение под текст: снизу на телефоне, слева на десктопе. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-ink via-ink/30 to-transparent md:bg-linear-to-r md:from-ink md:via-ink/70 md:to-transparent"
        />
      </div>

      <div className="relative z-10 mx-auto -mt-16 max-w-site px-2 pb-6 md:absolute md:inset-x-0 md:bottom-0 md:mt-0 md:px-3 md:pb-10">
        <div className="flex max-w-80 flex-col gap-2 md:gap-3">
          <Eyebrow>{hero.eyebrow}</Eyebrow>
          <h1 id="hero-title" className="font-display text-display text-paper">
            {hero.title}
          </h1>
          <p className="max-w-prose text-lead text-paper/85">{hero.lead}</p>
          <div className="flex flex-col gap-1.5 pt-1 sm:flex-row sm:flex-wrap sm:gap-2">
            <ButtonLink href="/menu" size="lg" icon={<ShoppingBag className="size-2.5" aria-hidden="true" />}>
              Заказать доставку
            </ButtonLink>
            <ButtonLink
              href="/booking"
              size="lg"
              variant="secondary"
              icon={<CalendarDays className="size-2.5" aria-hidden="true" />}
            >
              Забронировать стол
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
