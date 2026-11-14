"use client";

import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart/store";
import { Header } from "./Header";
import { MobileCartBar } from "./MobileCartBar";

/** Шапка, подключённая к корзине. */
export function SiteHeader() {
  const { count, subtotal } = useCart();
  const pathname = usePathname();
  return <Header cartCount={count} cartTotal={subtotal} pathname={pathname} />;
}

/** Оболочка шапки без подсветки пункта меню: показывается, пока путь страницы ещё неизвестен. */
export function SiteHeaderFallback() {
  const { count, subtotal } = useCart();
  return <Header cartCount={count} cartTotal={subtotal} />;
}

/** Полоса корзины внизу экрана на телефоне. */
export function SiteMobileCartBar() {
  const { count, subtotal } = useCart();
  return <MobileCartBar count={count} total={subtotal} />;
}
