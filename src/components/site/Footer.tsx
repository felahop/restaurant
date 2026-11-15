import Link from "next/link";
import { cacheLife } from "next/cache";
import { Clock, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Eyebrow } from "@/components/ui/Typography";
import { footerNav, legalNav } from "@/config/navigation";
import { restaurant } from "@/config/restaurant";
import { getSiteInfo, type SiteInfo } from "@/server/site-info";
import { MessengerLinks } from "./MessengerLinks";

/** Год для копирайта: вычисляется в кэше, чтобы страница оставалась статической. */
async function getCurrentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

/** Подвал с данными из настроек админ-панели. */
export async function SiteFooter() {
  const info = await getSiteInfo();
  return <Footer info={info} />;
}

/** info = null — статичная оболочка: навигация видна сразу, контакты догружаются. */
export async function Footer({ info }: { info: SiteInfo | null }) {
  const year = await getCurrentYear();
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-site gap-5 px-2 py-6 md:grid-cols-2 md:px-3 lg:grid-cols-[1.4fr_1fr_1.2fr_1fr] lg:gap-4 lg:py-8">
        <div className="flex flex-col gap-2">
          <Logo withTagline />
          {info ? <p className="max-w-narrow text-sm text-fg-muted">{info.description}</p> : null}
        </div>

        <nav aria-labelledby="footer-nav-title" className="flex flex-col gap-1.5">
          <Eyebrow as="span">
            <span id="footer-nav-title">Навигация</span>
          </Eyebrow>
          <ul className="flex flex-col">
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-5.5 items-center text-base text-fg hover:text-ginger"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-1.5">
          <Eyebrow as="span">Контакты</Eyebrow>
          {info ? (
            <address className="flex flex-col gap-1.5 text-base not-italic">
              <a
                href={`tel:${info.phoneE164}`}
                className="inline-flex min-h-5.5 items-center gap-1 font-semibold text-fg tabular-nums hover:text-ginger"
              >
                <Phone className="size-2 text-ginger" aria-hidden="true" />
                {info.phoneDisplay}
              </a>
              <p className="flex items-start gap-1 text-fg">
                <MapPin className="mt-0.5 size-2 shrink-0 text-ginger" aria-hidden="true" />
                <span>
                  {info.addressFull}
                  {info.metro ? <span className="block text-sm text-fg-muted">м. {info.metro}</span> : null}
                </span>
              </p>
              <p className="flex items-start gap-1 text-sm text-fg-muted">
                <Clock className="mt-0.5 size-2 shrink-0 text-ginger" aria-hidden="true" />
                <span className="flex flex-col">
                  {info.hoursLines.map((line) => (
                    <span key={line} className="whitespace-nowrap">
                      {line}
                    </span>
                  ))}
                </span>
              </p>
            </address>
          ) : (
            <div className="min-h-20" aria-hidden="true" />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Eyebrow as="span">Мы на связи</Eyebrow>
          {info ? (
            <>
              <MessengerLinks items={info.messengers} />
              <a
                href={`mailto:${info.email}`}
                className="inline-flex min-h-5.5 items-center text-sm text-fg-muted hover:text-fg"
              >
                {info.email}
              </a>
            </>
          ) : null}
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-site flex-col gap-1 px-2 py-2 text-sm text-fg-muted md:flex-row md:items-center md:justify-between md:px-3">
          <p>
            © {year} {info?.name ?? restaurant.name}
            {info?.legalName ? ` · ${info.legalName}` : null}
          </p>
          <ul className="flex flex-wrap gap-x-3">
            {legalNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-5.5 items-center underline-offset-4 hover:text-fg hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
