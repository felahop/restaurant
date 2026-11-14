/**
 * Корзина на клиенте: чистые функции без побочных эффектов.
 * Цены здесь — только для показа. Итог заказа всегда пересчитывает сервер по ценам из базы.
 */

export const MAX_LINE_QTY = 99;

export type CartModifier = { id: string; name: string; price: number };

export type CartLine = {
  /** Ключ строки: блюдо + набор добавок. Одинаковые сочетания складываются. */
  key: string;
  dishId: string;
  slug: string;
  name: string;
  /** Цена одной порции с добавками, в копейках (снимок для отображения). */
  unitPrice: number;
  qty: number;
  imageUrl?: string | null;
  kanji?: string;
  modifiers: CartModifier[];
};

export type CartState = {
  version: 1;
  lines: CartLine[];
};

export const EMPTY_CART: CartState = Object.freeze({ version: 1, lines: [] }) as CartState;

export type AddInput = Omit<CartLine, "key" | "qty" | "modifiers"> & {
  modifiers?: CartModifier[];
  qty?: number;
};

export function lineKey(dishId: string, modifiers: CartModifier[] = []): string {
  const ids = modifiers.map((m) => m.id).sort();
  return ids.length ? `${dishId}:${ids.join(",")}` : dishId;
}

function clampQty(qty: number): number {
  if (!Number.isFinite(qty)) return 0;
  return Math.max(0, Math.min(MAX_LINE_QTY, Math.trunc(qty)));
}

export function addItem(state: CartState, input: AddInput): CartState {
  const modifiers = input.modifiers ?? [];
  const key = lineKey(input.dishId, modifiers);
  const qty = clampQty(input.qty ?? 1);
  if (qty === 0) return state;
  const existing = state.lines.find((l) => l.key === key);
  if (existing) {
    return setQty(state, key, existing.qty + qty);
  }
  const line: CartLine = { ...input, key, qty, modifiers };
  return { ...state, lines: [...state.lines, line] };
}

/** Меняет количество; 0 и меньше удаляет строку. */
export function setQty(state: CartState, key: string, qty: number): CartState {
  const next = clampQty(qty);
  if (next === 0) return removeLine(state, key);
  return {
    ...state,
    lines: state.lines.map((l) => (l.key === key ? { ...l, qty: next } : l)),
  };
}

export function removeLine(state: CartState, key: string): CartState {
  return { ...state, lines: state.lines.filter((l) => l.key !== key) };
}

export function cartCount(state: CartState): number {
  return state.lines.reduce((sum, l) => sum + l.qty, 0);
}

export function cartSubtotal(state: CartState): number {
  return state.lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
}

/** Сколько порций блюда (во всех вариантах добавок) уже в корзине. */
export function dishQty(state: CartState, dishId: string): number {
  return state.lines.reduce((sum, l) => (l.dishId === dishId ? sum + l.qty : sum), 0);
}

/** Безопасно читает сохранённую корзину: всё подозрительное отбрасывается. */
export function parseStoredCart(raw: string | null): CartState {
  if (!raw) return EMPTY_CART;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || (data as { version?: unknown }).version !== 1) return EMPTY_CART;
    const lines = (data as { lines?: unknown }).lines;
    if (!Array.isArray(lines)) return EMPTY_CART;
    const valid: CartLine[] = [];
    for (const l of lines) {
      if (
        l &&
        typeof l === "object" &&
        typeof l.key === "string" &&
        typeof l.dishId === "string" &&
        typeof l.slug === "string" &&
        typeof l.name === "string" &&
        Number.isInteger(l.unitPrice) &&
        l.unitPrice >= 0 &&
        Number.isInteger(l.qty) &&
        l.qty > 0 &&
        Array.isArray(l.modifiers)
      ) {
        valid.push({ ...l, qty: clampQty(l.qty) });
      }
    }
    return { version: 1, lines: valid };
  } catch {
    return EMPTY_CART;
  }
}
