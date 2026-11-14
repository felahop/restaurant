"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Phone, User, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { mainNav } from "@/config/navigation";
import { restaurant } from "@/config/restaurant";
import { cn } from "@/lib/cn";
import { CartButton } from "./CartButton";
import { MessengerLinks } from "./MessengerLinks";

type HeaderProps = { cartCount: number; cartTotal: number };

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header({ cartCount, cartTotal }: HeaderProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Закрываем мобильное меню при переходе на другую страницу.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  const { phoneDisplay, phoneE164 } = restaurant.contacts;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-canvas transition-colors duration-200",
        scrolled ? "border-line" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-8 max-w-site items-center justify-between gap-2 px-2 md:px-3">
        <Logo />

        <nav aria-label="Основная навигация" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {mainNav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-5.5 items-center rounded-full px-1.5 text-base font-medium transition-colors duration-150 hover:text-fg",
                      active ? "text-fg" : "text-fg-muted",
                    )}
                  >
                    {item.label}
                    {active ? (
                      <span className="absolute inset-x-1.5 bottom-0.5 h-px bg-ginger" aria-hidden="true" />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center md:gap-1">
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
          <Link
            href="/account"
            aria-label="Личный кабинет"
            className="hidden size-5.5 items-center justify-center rounded-full text-fg transition-colors duration-150 hover:bg-surface-2 lg:inline-flex"
          >
            <User className="size-2.5" aria-hidden="true" />
          </Link>
          <CartButton count={cartCount} total={cartTotal} />
          <IconButton
            label="Открыть меню"
            className="lg:hidden"
            aria-haspopup="dialog"
            onClick={() => dialogRef.current?.showModal()}
          >
            <Menu className="size-3" aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        aria-label="Меню сайта"
        className="m-0 h-dvh max-h-none w-full max-w-none bg-canvas p-0 text-fg backdrop:bg-shade lg:hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-8 items-center justify-between border-b border-line px-2">
            <Logo />
            <IconButton label="Закрыть меню" onClick={() => dialogRef.current?.close()}>
              <X className="size-3" aria-hidden="true" />
            </IconButton>
          </div>
          <nav aria-label="Мобильная навигация" className="flex-1 overflow-y-auto px-2 py-3">
            <ul className="flex flex-col">
              {[...mainNav, { href: "/account", label: "Личный кабинет" } as const].map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href} className="border-b border-line">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => dialogRef.current?.close()}
                      className={cn(
                        "flex min-h-7 items-center font-display text-h3",
                        active ? "text-ginger" : "text-fg",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex flex-col gap-2">
              <a href={`tel:${phoneE164}`} className="text-h3 font-semibold text-fg tabular-nums">
                {phoneDisplay}
              </a>
              <ul className="flex flex-wrap gap-x-2 text-sm text-fg-muted">
                {restaurant.hoursLines.map((line) => (
                  <li key={line} className="whitespace-nowrap">
                    {line}
                  </li>
                ))}
              </ul>
              <MessengerLinks />
            </div>
          </nav>
          <div className="border-t border-line p-2 pb-[max(16px,env(safe-area-inset-bottom))]">
            <ButtonLink href="/menu" block size="lg" onClick={() => dialogRef.current?.close()}>
              Заказать доставку
            </ButtonLink>
          </div>
        </div>
      </dialog>
    </header>
  );
}
