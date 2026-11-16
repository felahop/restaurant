"use client";

import { useSyncExternalStore } from "react";
import { formatRub } from "@/lib/money";
import {
  addItem,
  cartCount,
  cartSubtotal,
  dishQty,
  EMPTY_CART,
  parseStoredCart,
  lineKey,
  removeLine,
  setQty,
  type AddInput,
  type CartState,
} from "./core";

const STORAGE_KEY = "sumibi.cart.v1";

type Listener = () => void;

let state: CartState = EMPTY_CART;
let hydrated = false;
let announcement = { id: 0, text: "" };
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

function read(): CartState {
  try {
    return parseStoredCart(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return EMPTY_CART;
  }
}

function persist(next: CartState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Приватный режим или переполнение: корзина живёт до закрытия вкладки.
  }
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  state = read();
  // Синхронизация между вкладками.
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      state = read();
      emit();
    }
  });
}

function update(next: CartState, message?: string) {
  state = next;
  persist(next);
  if (message) announcement = { id: announcement.id + 1, text: message };
  emit();
}

function subscribe(listener: Listener) {
  ensureHydrated();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => {
  ensureHydrated();
  return state;
};
const getServerSnapshot = () => EMPTY_CART;

export const cart = {
  add(input: AddInput) {
    const next = addItem(state, input);
    const qty = dishQty(next, input.dishId);
    update(next, `${input.name} — в корзине ${qty} шт. Итого ${formatRub(cartSubtotal(next))}`);
  },
  setQty(key: string, qty: number) {
    const line = state.lines.find((l) => l.key === key);
    const next = setQty(state, key, qty);
    if (!line) return update(next);
    update(next, qty <= 0 ? `${line.name} удалено из корзины` : `${line.name}: ${Math.min(qty, 99)} шт.`);
  },
  remove(key: string) {
    const line = state.lines.find((l) => l.key === key);
    update(removeLine(state, key), line ? `${line.name} удалено из корзины` : undefined);
  },
  clear() {
    update(EMPTY_CART, "Корзина очищена");
  },
  /** Замена корзины целиком (синхронизация с аккаунтом, «Повторить заказ»). */
  replace(next: CartState, message?: string) {
    update(next, message);
  },
  snapshot(): CartState {
    ensureHydrated();
    return state;
  },
  /** Подписка на изменения корзины (синхронизация с аккаунтом). */
  subscribe(listener: () => void) {
    return subscribe(listener);
  },
};

export function useCart() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    state: snapshot,
    count: cartCount(snapshot),
    subtotal: cartSubtotal(snapshot),
    /** Порции блюда во всех вариантах добавок. */
    qtyOfDish: (dishId: string) => dishQty(snapshot, dishId),
    /** Порции конкретной строки (блюдо без добавок — ключ равен id блюда). */
    qtyOfLine: (key: string) => snapshot.lines.find((l) => l.key === key)?.qty ?? 0,
  };
}

export { lineKey };

export function useCartAnnouncement() {
  return useSyncExternalStore(
    subscribe,
    () => announcement,
    () => announcement,
  );
}
