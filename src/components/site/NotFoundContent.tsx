import { KanjiBackdrop } from "@/components/brand/KanjiBackdrop";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Typography";

export function NotFoundContent() {
  return (
    <section className="relative overflow-hidden">
      <KanjiBackdrop char="道" className="-top-6 -right-6" />
      <div className="relative mx-auto flex max-w-site flex-col items-start gap-3 px-2 py-10 md:px-3 md:py-16">
        <Eyebrow>Ошибка 404</Eyebrow>
        <h1 className="font-display text-h1 text-fg">Такой страницы нет</h1>
        <p className="max-w-prose text-lead text-fg-muted">
          Возможно, блюдо убрали из меню или в ссылке опечатка. Зато кухня работает — загляните в меню.
        </p>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-2">
          <ButtonLink href="/menu" size="lg">
            Открыть меню
          </ButtonLink>
          <ButtonLink href="/" size="lg" variant="secondary">
            На главную
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
