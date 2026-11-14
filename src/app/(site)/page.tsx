import { KanjiBackdrop } from "@/components/brand/KanjiBackdrop";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/Typography";

/** Временная главная: полноценная страница появится на этапе 2. */
export default function HomePage() {
  return (
    <section className="relative overflow-hidden">
      <KanjiBackdrop char="炭" className="-top-4 -right-4" />
      <div className="relative mx-auto flex max-w-site flex-col gap-4 px-2 py-10 md:px-3 md:py-16">
        <SectionHeading
          as="h1"
          eyebrow="Скоро открытие"
          title="Приходите голодными"
          lead="Главная страница появится на следующем этапе. Пока можно посмотреть витрину компонентов."
        />
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/styleguide" size="lg">
            Открыть витрину
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
