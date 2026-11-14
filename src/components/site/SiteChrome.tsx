"use client";

import { useCart } from "@/lib/cart/store";
import { Header } from "./Header";
import { MobileCartBar } from "./MobileCartBar";

/** Шапка, подключённая к корзине. */
export function SiteHeader() {
  const { count, subtotal } = useCart();
  return <Header cartCount={count} cartTotal={subtotal} />;
}

/** Полоса корзины внизу экрана на телефоне. */
export function SiteMobileCartBar() {
  const { count, subtotal } = useCart();
  return <MobileCartBar count={count} total={subtotal} />;
}
