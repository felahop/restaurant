import { describe, expect, it } from "vitest";
import {
  addItem,
  cartCount,
  cartSubtotal,
  dishQty,
  EMPTY_CART,
  lineKey,
  MAX_LINE_QTY,
  parseStoredCart,
  removeLine,
  setQty,
} from "@/lib/cart/core";

const ramen = { dishId: "d1", slug: "tonkotsu-ramen", name: "Тонкоцу рамен", unitPrice: 69_000 };
const egg = { id: "m-egg", name: "Яйцо", price: 9_000 };
const chili = { id: "m-chili", name: "Чили-масло", price: 5_000 };

describe("корзина", () => {
  it("складывает одинаковые позиции", () => {
    let s = addItem(EMPTY_CART, ramen);
    s = addItem(s, ramen);
    expect(s.lines).toHaveLength(1);
    expect(cartCount(s)).toBe(2);
    expect(cartSubtotal(s)).toBe(138_000);
  });

  it("разные добавки — разные строки, порядок добавок не важен", () => {
    let s = addItem(EMPTY_CART, { ...ramen, unitPrice: 83_000, modifiers: [egg, chili] });
    s = addItem(s, { ...ramen, unitPrice: 83_000, modifiers: [chili, egg] });
    s = addItem(s, ramen);
    expect(s.lines).toHaveLength(2);
    expect(lineKey("d1", [chili, egg])).toBe(lineKey("d1", [egg, chili]));
    expect(dishQty(s, "d1")).toBe(3);
    expect(cartSubtotal(s)).toBe(83_000 * 2 + 69_000);
  });

  it("количество ограничено и не уходит в минус", () => {
    let s = addItem(EMPTY_CART, { ...ramen, qty: 500 });
    expect(cartCount(s)).toBe(MAX_LINE_QTY);
    s = setQty(s, "d1", -3);
    expect(s.lines).toHaveLength(0);
  });

  it("удаление строки", () => {
    const s = removeLine(addItem(EMPTY_CART, ramen), "d1");
    expect(cartCount(s)).toBe(0);
  });

  it("не мутирует исходное состояние", () => {
    const a = addItem(EMPTY_CART, ramen);
    const b = setQty(a, "d1", 5);
    expect(cartCount(a)).toBe(1);
    expect(cartCount(b)).toBe(5);
    expect(EMPTY_CART.lines).toHaveLength(0);
  });
});

describe("чтение сохранённой корзины", () => {
  it("восстанавливает корректные данные", () => {
    const s = addItem(EMPTY_CART, { ...ramen, qty: 2 });
    expect(parseStoredCart(JSON.stringify(s))).toEqual(s);
  });

  it("отбрасывает мусор и подменённые значения", () => {
    expect(parseStoredCart(null)).toEqual(EMPTY_CART);
    expect(parseStoredCart("{oops")).toEqual(EMPTY_CART);
    expect(parseStoredCart(JSON.stringify({ version: 2, lines: [] }))).toEqual(EMPTY_CART);
    const tampered = {
      version: 1,
      lines: [
        { key: "d1", dishId: "d1", slug: "x", name: "x", unitPrice: -100, qty: 1, modifiers: [] },
        { key: "d2", dishId: "d2", slug: "y", name: "y", unitPrice: 1.5, qty: 1, modifiers: [] },
        { key: "d3", dishId: "d3", slug: "z", name: "z", unitPrice: 100, qty: 0, modifiers: [] },
        { key: "d4", dishId: "d4", slug: "w", name: "w", unitPrice: 100, qty: 1000, modifiers: [] },
      ],
    };
    const parsed = parseStoredCart(JSON.stringify(tampered));
    expect(parsed.lines.map((l) => l.key)).toEqual(["d4"]);
    expect(parsed.lines[0]?.qty).toBe(MAX_LINE_QTY);
  });
});
