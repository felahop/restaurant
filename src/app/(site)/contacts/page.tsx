import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarDays, Car, Clock, ExternalLink, Mail, MapPin, Navigation, Phone } from "lucide-react";
import { ContactForm } from "@/components/contacts/ContactForm";
import { MapPreview } from "@/components/home/MapPreview";
import { MessengerLinks } from "@/components/site/MessengerLinks";
import { ButtonLink, buttonStyles } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Typography";
import { yandexMapsPointUrl, yandexMapsRouteUrl } from "@/lib/maps/links";
import { getSiteInfo } from "@/server/site-info";

export const metadata: Metadata = {
  title: "Контакты",
  description: "Адрес, часы работы, телефон и мессенджеры. Напишите нам — ответим в течение дня.",
  alternates: { canonical: "/contacts" },
};

function Row({ Icon, label, children }: { Icon: typeof MapPin; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-1.5">
      <Icon className="mt-0.5 size-2.5 shrink-0 text-ginger" aria-hidden="true" />
      <div className="flex flex-col">
        <dt className="sr-only">{label}</dt>
        {children}
      </div>
    </div>
  );
}

async function ContactsInfo() {
  const info = await getSiteInfo();
  return (
    <div className="grid items-start gap-3 md:grid-cols-[5fr_6fr] md:gap-4">
      <div className="flex flex-col gap-3">
        <dl className="flex flex-col gap-2">
          <Row Icon={MapPin} label="Адрес">
            <dd className="text-lead text-fg">{info.addressFull}</dd>
            {info.metro ? <dd className="text-sm text-fg-muted">м. {info.metro}</dd> : null}
          </Row>
          <Row Icon={Clock} label="Часы работы">
            <dd className="flex flex-col text-base text-fg">
              {info.hoursLines.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </dd>
          </Row>
          <Row Icon={Phone} label="Телефон">
            <dd>
              <a href={`tel:${info.phoneE164}`} className="text-lead font-semibold text-fg tabular-nums hover:text-ginger">
                {info.phoneDisplay}
              </a>
            </dd>
            <dd className="text-sm text-fg-muted">Доставка, бронь и вопросы — по одному номеру</dd>
          </Row>
          <Row Icon={Mail} label="Почта">
            <dd>
              <a href={`mailto:${info.email}`} className="text-base text-fg underline-offset-4 hover:underline">
                {info.email}
              </a>
            </dd>
          </Row>
          {info.parking ? (
            <Row Icon={Car} label="Парковка">
              <dd className="text-base text-fg-muted">{info.parking}</dd>
            </Row>
          ) : null}
        </dl>
        <MessengerLinks items={info.messengers} />
        <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-2">
          <ButtonLink href="/booking" size="lg" icon={<CalendarDays className="size-2.5" aria-hidden="true" />}>
            Забронировать стол
          </ButtonLink>
          <a href={yandexMapsRouteUrl(info.lat, info.lng)} target="_blank" rel="noopener noreferrer" className={buttonStyles({ variant: "secondary", size: "lg" })}>
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
  );
}

export default function ContactsPage() {
  return (
    <div className="mx-auto flex max-w-site flex-col gap-4 px-2 pt-3 pb-8 md:px-3 md:pt-6 md:pb-12">
      <header className="flex flex-col gap-1">
        <Eyebrow>Приходите голодными</Eyebrow>
        <h1 className="font-display text-h1 text-fg">Контакты</h1>
      </header>
      <Suspense fallback={<div className="h-60 animate-pulse rounded-card bg-surface" aria-busy="true" />}>
        <ContactsInfo />
      </Suspense>
      <div className="max-w-prose">
        <ContactForm />
      </div>
    </div>
  );
}
