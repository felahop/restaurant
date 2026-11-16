import { CalendarDays, Car, Clock, ExternalLink, MapPin, Navigation, Phone } from "lucide-react";
import { ButtonLink, buttonStyles } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/Typography";
import { yandexMapsPointUrl, yandexMapsRouteUrl } from "@/lib/maps/links";
import { getSiteInfo, type SiteInfo } from "@/server/site-info";
import { MapPreview } from "./MapPreview";

const ROW = "grid grid-cols-[auto_1fr] items-start gap-x-1.5 [&>dd]:col-start-2";
const TERM = "row-span-3 pt-0.5";

export async function SiteFindUsSection() {
  return <FindUsSection info={await getSiteInfo()} />;
}

/** «Как нас найти»: адрес, карта, часы, парковка и две кнопки действия. info = null — заглушка того же размера. */
export function FindUsSection({ info }: { info: SiteInfo | null }) {
  if (!info) {
    return (
      <section aria-labelledby="find-title" aria-busy="true" className="py-8 md:py-12">
        <div className="mx-auto grid max-w-site items-start gap-4 px-2 md:grid-cols-[5fr_6fr] md:gap-6 md:px-3">
          <SectionHeading id="find-title" eyebrow="Как нас найти" title="Ждём в зале у огня" />
          <div className="aspect-4/3 animate-pulse rounded-card bg-surface" />
        </div>
      </section>
    );
  }
  return (
    <section aria-labelledby="find-title" className="py-8 md:py-12">
      <div
        data-reveal
        className="mx-auto grid max-w-site items-start gap-4 px-2 md:grid-cols-[5fr_6fr] md:gap-6 md:px-3"
      >
        <div className="flex flex-col gap-3">
          <SectionHeading id="find-title" eyebrow="Как нас найти" title="Ждём в зале у огня" />
          <dl className="flex flex-col gap-2">
            {/* dl > div > (dt, dd): иконка — в dt вместе со скрытой подписью, значения — в dd. */}
            <div className={ROW}>
              <dt className={TERM}>
                <MapPin className="size-2.5 text-ginger" aria-hidden="true" />
                <span className="sr-only">Адрес</span>
              </dt>
              <dd className="text-lead text-fg">{info.addressFull}</dd>
              {info.metro ? <dd className="text-sm text-fg-muted">м. {info.metro}</dd> : null}
            </div>
            <div className={ROW}>
              <dt className={TERM}>
                <Clock className="size-2.5 text-ginger" aria-hidden="true" />
                <span className="sr-only">Часы работы</span>
              </dt>
              <dd className="flex flex-col text-base text-fg">
                {info.hoursLines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </dd>
            </div>
            {info.parking ? (
              <div className={ROW}>
                <dt className={TERM}>
                  <Car className="size-2.5 text-ginger" aria-hidden="true" />
                  <span className="sr-only">Парковка</span>
                </dt>
                <dd className="text-base text-fg-muted">{info.parking}</dd>
              </div>
            ) : null}
            <div className={ROW}>
              <dt className={TERM}>
                <Phone className="size-2.5 text-ginger" aria-hidden="true" />
                <span className="sr-only">Телефон</span>
              </dt>
              <dd>
                <a
                  href={`tel:${info.phoneE164}`}
                  className="text-lead font-semibold text-fg tabular-nums hover:text-ginger"
                >
                  {info.phoneDisplay}
                </a>
              </dd>
            </div>
          </dl>
          <div className="flex flex-col gap-1.5 pt-1 sm:flex-row sm:flex-wrap sm:gap-2">
            <ButtonLink href="/booking" size="lg" icon={<CalendarDays className="size-2.5" aria-hidden="true" />}>
              Забронировать стол
            </ButtonLink>
            <a
              href={yandexMapsRouteUrl(info.lat, info.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonStyles({ variant: "secondary", size: "lg" })}
            >
              <Navigation className="size-2.5" aria-hidden="true" />
              Построить маршрут
              <span className="sr-only"> (Яндекс Карты, откроется в новой вкладке)</span>
            </a>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <MapPreview name={info.name} address={info.addressFull} />
          <a
            href={yandexMapsPointUrl(info.lat, info.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-5.5 items-center gap-1 self-start text-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline"
          >
            Открыть в Яндекс Картах
            <ExternalLink className="size-2" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
