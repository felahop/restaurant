"use client";

import { useCartAnnouncement } from "@/lib/cart/store";

/** Озвучивает изменения корзины для скринридеров. */
export function CartAnnouncer() {
  const { id, text } = useCartAnnouncement();
  return (
    <p className="sr-only" aria-live="polite" role="status">
      <span key={id}>{text}</span>
    </p>
  );
}
