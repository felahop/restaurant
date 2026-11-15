import { Phone } from "lucide-react";
import { getSiteInfo } from "@/server/site-info";
import { MessengerLinks } from "./MessengerLinks";

/**
 * Контакты для шапки — серверные «вставки» в клиентскую шапку.
 * Шапка остаётся на месте, когда они приходят потоком, поэтому открытое меню не закрывается.
 */
export async function HeaderPhone() {
  const { phoneDisplay, phoneE164 } = await getSiteInfo();
  return (
    <>
      <a
        href={`tel:${phoneE164}`}
        className="hidden h-5.5 items-center gap-1 rounded-full px-1.5 text-base font-semibold text-fg tabular-nums transition-colors duration-150 hover:bg-surface-2 md:inline-flex"
      >
        <Phone className="size-2 text-ginger" aria-hidden="true" />
        {phoneDisplay}
      </a>
      <a
        href={`tel:${phoneE164}`}
        aria-label={`Позвонить: ${phoneDisplay}`}
        className="inline-flex size-5.5 items-center justify-center rounded-full text-fg transition-colors duration-150 hover:bg-surface-2 md:hidden"
      >
        <Phone className="size-2.5" aria-hidden="true" />
      </a>
    </>
  );
}

/** Место под телефон, пока он загружается: кнопки справа не сдвигаются. */
export function HeaderPhonePlaceholder() {
  return <span aria-hidden="true" className="inline-block size-5.5 md:h-5.5 md:w-25" />;
}

/** Телефон, часы и мессенджеры внизу мобильного меню. */
export async function HeaderDrawerContacts() {
  const { phoneDisplay, phoneE164, hoursLines, messengers } = await getSiteInfo();
  return (
    <div className="mt-4 flex flex-col gap-2">
      <a href={`tel:${phoneE164}`} className="text-h3 font-semibold text-fg tabular-nums">
        {phoneDisplay}
      </a>
      <ul className="flex flex-wrap gap-x-2 text-sm text-fg-muted">
        {hoursLines.map((line) => (
          <li key={line} className="whitespace-nowrap">
            {line}
          </li>
        ))}
      </ul>
      <MessengerLinks items={messengers} />
    </div>
  );
}
