import { Clock, MapPin, Phone } from "lucide-react";
import { getSiteInfo, type SiteInfo } from "@/server/site-info";

/** Блок с данными из настроек админ-панели. */
export async function SiteInfoStrip() {
  return <InfoStrip info={await getSiteInfo()} />;
}

const Placeholder = () => <span className="block h-2.5 w-20 animate-pulse rounded-full bg-surface" />;

/** Адрес, часы и телефон сразу под первым экраном. info = null — заглушки, пока данные загружаются. */
export function InfoStrip({ info }: { info: SiteInfo | null }) {
  const items = [
    {
      key: "address",
      Icon: MapPin,
      label: "Адрес",
      body: info ? (
        <>
          <span className="text-fg">{info.addressShort}</span>
          {info.metro ? <span className="block text-sm text-fg-muted">м. {info.metro}</span> : null}
        </>
      ) : (
        <Placeholder />
      ),
    },
    {
      key: "hours",
      Icon: Clock,
      label: "Часы",
      body: info ? (
        <span className="flex flex-col text-sm text-fg">
          {info.hoursLines.map((line) => (
            <span key={line} className="whitespace-nowrap">
              {line}
            </span>
          ))}
        </span>
      ) : (
        <Placeholder />
      ),
    },
    {
      key: "phone",
      Icon: Phone,
      label: "Телефон",
      body: info ? (
        <>
          <a href={`tel:${info.phoneE164}`} className="font-semibold text-fg tabular-nums hover:text-ginger">
            {info.phoneDisplay}
          </a>
          <span className="block text-sm text-fg-muted">Доставка и бронь — по одному номеру</span>
        </>
      ) : (
        <Placeholder />
      ),
    },
  ];
  return (
    <section aria-label="Адрес, часы работы и телефон" className="border-y border-line">
      <dl aria-busy={info ? undefined : true} className="mx-auto grid max-w-site gap-2 px-2 py-3 md:grid-cols-3 md:gap-3 md:px-3 md:py-4">
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
