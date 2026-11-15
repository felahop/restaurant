"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart/store";
import { Header } from "./Header";
import { MobileCartBar } from "./MobileCartBar";

type Slots = { phone?: ReactNode; drawerContacts?: ReactNode };

/** Шапка, подключённая к корзине. Контакты — серверные вставки из настроек админ-панели. */
export function SiteHeader(slots: Slots) {
  const { count, subtotal } = useCart();
  const pathname = usePathname();
  return <Header {...slots} cartCount={count} cartTotal={subtotal} pathname={pathname} />;
}

/** Оболочка шапки без подсветки пункта меню: показывается, пока путь страницы ещё неизвестен. */
export function SiteHeaderFallback(slots: Slots) {
  const { count, subtotal } = useCart();
  return <Header {...slots} cartCount={count} cartTotal={subtotal} />;
}

/** Полоса корзины внизу экрана на телефоне. На экране оформления и заказа не нужна. */
export function SiteMobileCartBar() {
  const { count, subtotal } = useCart();
  const pathname = usePathname();
  if (pathname === "/checkout" || pathname.startsWith("/order/")) return null;
  return <MobileCartBar count={count} total={subtotal} />;
}
