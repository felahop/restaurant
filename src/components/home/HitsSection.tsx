import { ArrowRight } from "lucide-react";
import { CartDishCard } from "@/components/site/CartDishCard";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/Typography";
import { hitsIntro } from "@/data/home";
import type { DishCardData } from "@/types/dish";

/** «Хиты»: четыре карточки с быстрым добавлением. На телефоне — горизонтальная лента. */
export function HitsSection({ dishes }: { dishes: DishCardData[] }) {
  return (
    <section aria-labelledby="hits-title" className="py-8 md:py-12">
      <div data-reveal className="mx-auto flex max-w-site flex-col gap-4 px-2 md:px-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <SectionHeading id="hits-title" eyebrow={hitsIntro.eyebrow} title={hitsIntro.title} lead={hitsIntro.lead} />
          {/* Обёртка управляет видимостью: у кнопки свой display, классы не конфликтуют. */}
          <div className="hidden shrink-0 md:block">
            <ButtonLink href="/menu" variant="secondary" icon={<ArrowRight className="size-2.5" aria-hidden="true" />}>
              Всё меню
            </ButtonLink>
          </div>
        </div>

        <ul className="scrollbar-none -mx-2 flex snap-x snap-mandatory scroll-px-2 gap-2 overflow-x-auto px-2 pb-1 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4">
          {dishes.map((dish) => (
            <li key={dish.id} className="flex w-[82%] shrink-0 snap-start sm:w-[46%] md:w-auto">
              <CartDishCard dish={dish} className="w-full" />
            </li>
          ))}
        </ul>

        <div className="md:hidden">
          <ButtonLink href="/menu" variant="secondary" block>
            Всё меню
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
