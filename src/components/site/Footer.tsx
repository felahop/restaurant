import Link from "next/link";
import { cacheLife } from "next/cache";
import { Clock, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Eyebrow } from "@/components/ui/Typography";
import { footerNav, legalNav } from "@/config/navigation";
import { restaurant } from "@/config/restaurant";
import { MessengerLinks } from "./MessengerLinks";

/** Год для копирайта: вычисляется в кэше, чтобы страница оставалась статической. */
async function getCurrentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function Footer() {
  const { contacts, address } = restaurant;
  const year = await getCurrentYear();
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-site gap-5 px-2 py-6 md:grid-cols-2 md:px-3 lg:grid-cols-[1.4fr_1fr_1.2fr_1fr] lg:gap-4 lg:py-8">
        <div className="flex flex-col gap-2">
          <Logo withTagline />
          <p className="max-w-narrow text-sm text-fg-muted">{restaurant.description}</p>
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
          <address className="flex flex-col gap-1.5 text-base not-italic">
            <a
              href={`tel:${contacts.phoneE164}`}
              className="inline-flex min-h-5.5 items-center gap-1 font-semibold text-fg tabular-nums hover:text-ginger"
            >
              <Phone className="size-2 text-ginger" aria-hidden="true" />
              {contacts.phoneDisplay}
            </a>
            <p className="flex items-start gap-1 text-fg">
              <MapPin className="mt-0.5 size-2 shrink-0 text-ginger" aria-hidden="true" />
              <span>
                {address.full}
                <span className="block text-sm text-fg-muted">м. {address.metro}</span>
              </span>
            </p>
            <p className="flex items-start gap-1 text-sm text-fg-muted">
              <Clock className="mt-0.5 size-2 shrink-0 text-ginger" aria-hidden="true" />
              <span className="flex flex-col">
                {restaurant.hoursLines.map((line) => (
                  <span key={line} className="whitespace-nowrap">
                    {line}
                  </span>
                ))}
              </span>
            </p>
          </address>
        </div>

        <div className="flex flex-col gap-1.5">
          <Eyebrow as="span">Мы на связи</Eyebrow>
          <MessengerLinks />
          <a
            href={`mailto:${contacts.email}`}
            className="inline-flex min-h-5.5 items-center text-sm text-fg-muted hover:text-fg"
          >
            {contacts.email}
          </a>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-site flex-col gap-1 px-2 py-2 text-sm text-fg-muted md:flex-row md:items-center md:justify-between md:px-3">
          <p>
            © {year} {restaurant.name} · {restaurant.legalName}
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
