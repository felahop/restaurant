import { Clock, MapPin, Phone } from "lucide-react";
import { restaurant } from "@/config/restaurant";

/** Адрес, часы и телефон сразу под первым экраном. */
export function InfoStrip() {
  const { address, contacts, hoursLines } = restaurant;
  const items = [
    {
      key: "address",
      Icon: MapPin,
      label: "Адрес",
      body: (
        <>
          <span className="text-fg">{address.short}</span>
          <span className="block text-sm text-fg-muted">м. {address.metro}</span>
        </>
      ),
    },
    {
      key: "hours",
      Icon: Clock,
      label: "Часы",
      body: (
        <span className="flex flex-col text-sm text-fg">
          {hoursLines.map((line) => (
            <span key={line} className="whitespace-nowrap">
              {line}
            </span>
          ))}
        </span>
      ),
    },
    {
      key: "phone",
      Icon: Phone,
      label: "Телефон",
      body: (
        <>
          <a href={`tel:${contacts.phoneE164}`} className="font-semibold text-fg tabular-nums hover:text-ginger">
            {contacts.phoneDisplay}
          </a>
          <span className="block text-sm text-fg-muted">Доставка и бронь — по одному номеру</span>
        </>
      ),
    },
  ];
  return (
    <section aria-label="Адрес, часы работы и телефон" className="border-y border-line">
      <dl className="mx-auto grid max-w-site gap-2 px-2 py-3 md:grid-cols-3 md:gap-3 md:px-3 md:py-4">
        {items.map(({ key, Icon, label, body }) => (
          <div key={key} className="flex items-start gap-1.5">
            <Icon className="mt-0.5 size-2.5 shrink-0 text-ginger" aria-hidden="true" />
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs font-semibold tracking-eyebrow text-eyebrow uppercase">{label}</dt>
              <dd>{body}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
