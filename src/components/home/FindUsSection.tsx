import { CalendarDays, Car, Clock, ExternalLink, MapPin, Navigation, Phone } from "lucide-react";
import { ButtonLink, buttonStyles } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/Typography";
import { yandexMapsPointUrl, yandexMapsRouteUrl } from "@/lib/maps/links";
import { getSiteInfo, type SiteInfo } from "@/server/site-info";
import { MapPreview } from "./MapPreview";

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
            <div className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 size-2.5 shrink-0 text-ginger" aria-hidden="true" />
              <div>
                <dt className="sr-only">Адрес</dt>
                <dd className="text-lead text-fg">{info.addressFull}</dd>
                {info.metro ? <dd className="text-sm text-fg-muted">м. {info.metro}</dd> : null}
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <Clock className="mt-0.5 size-2.5 shrink-0 text-ginger" aria-hidden="true" />
              <div>
                <dt className="sr-only">Часы работы</dt>
                <dd className="flex flex-col text-base text-fg">
                  {info.hoursLines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </dd>
              </div>
            </div>
            {info.parking ? (
              <div className="flex items-start gap-1.5">
                <Car className="mt-0.5 size-2.5 shrink-0 text-ginger" aria-hidden="true" />
                <div>
                  <dt className="sr-only">Парковка</dt>
                  <dd className="text-base text-fg-muted">{info.parking}</dd>
                </div>
              </div>
            ) : null}
            <div className="flex items-start gap-1.5">
              <Phone className="mt-0.5 size-2.5 shrink-0 text-ginger" aria-hidden="true" />
              <div>
                <dt className="sr-only">Телефон</dt>
                <dd>
                  <a
                    href={`tel:${info.phoneE164}`}
                    className="text-lead font-semibold text-fg tabular-nums hover:text-ginger"
                  >
                    {info.phoneDisplay}
                  </a>
                </dd>
              </div>
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
