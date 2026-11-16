"use client";

import { useEffect } from "react";
import { cart } from "@/lib/cart/store";
import type { CartState } from "@/lib/cart/core";

const signedIn = () => typeof document !== "undefined" && /(?:^|;\s*)signed_in=1/.test(document.cookie);

async function put(state: CartState, merge: boolean): Promise<CartState | null> {
  try {
    const res = await fetch("/api/cart", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines: state.lines, merge }),
    });
    return res.ok ? ((await res.json()) as CartState) : null;
  } catch {
    return null;
  }
}

let started = false;

/**
 * Синхронизация корзины с аккаунтом: при входе корзина браузера сливается с корзиной аккаунта,
 * дальше изменения сохраняются (с задержкой 0,6 с). Вызывается при открытии сайта и сразу после входа.
 */
export async function startCartSync(): Promise<void> {
  if (started || !signedIn()) return;
  started = true;
  let syncing = true;
  let timer = 0;
  cart.subscribe(() => {
    if (syncing) return;
    if (!signedIn()) return; // вышел — больше не сохраняем
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void put(cart.snapshot(), false), 600);
  });
  const merged = await put(cart.snapshot(), true);
  if (merged) cart.replace(merged);
  syncing = false;
}

export function CartSync() {
  useEffect(() => {
    void startCartSync();
  }, []);
  return null;
}
