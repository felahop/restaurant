import { Suspense, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { Eyebrow } from "@/components/ui/Typography";
import { getSiteInfo, type SiteInfo } from "@/server/site-info";

/** Юридический текст: шаблон с подстановкой реквизитов из настроек. Обязательно проверить юристу. */
export function LegalDocument({ title, updated, children }: { title: string; updated: string; children: (info: SiteInfo) => ReactNode }) {
  return (
    <article className="mx-auto flex max-w-prose flex-col gap-3 px-2 pt-3 pb-8 md:px-3 md:pt-6 md:pb-12">
      <header className="flex flex-col gap-1">
        <Eyebrow>Документы</Eyebrow>
        <h1 className="font-display text-h3 break-words text-fg sm:text-h2">{title}</h1>
        <p className="text-sm text-fg-muted">Редакция от {updated}</p>
      </header>
      <p role="note" className="flex items-start gap-1 rounded-card border border-ginger p-2 text-sm text-fg">
        <TriangleAlert className="mt-px size-2 shrink-0 text-ginger" aria-hidden="true" />
        <span>
          Шаблон. Текст должен проверить и заменить юрист с учётом законодательства страны, где работает ресторан, и
          реальных реквизитов. Данные в квадратных скобках — заполнить.
        </span>
      </p>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-card bg-surface" aria-busy="true" />}>
        <LegalBody>{children}</LegalBody>
      </Suspense>
    </article>
  );
}

async function LegalBody({ children }: { children: (info: SiteInfo) => ReactNode }) {
  const info = await getSiteInfo();
  return (
    <div className="flex flex-col gap-2 text-base text-fg [&_h2]:pt-2 [&_h2]:text-title [&_h2]:font-semibold [&_li]:ml-3 [&_li]:list-disc [&_p]:text-fg-muted [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-0.5 [&_ul]:text-fg-muted">
      {children(info)}
    </div>
  );
}
