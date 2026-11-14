import { describe, expect, it } from "vitest";
import { formatRub, plural } from "@/lib/money";

const NBSP = " ";

describe("formatRub", () => {
  it("форматирует целые рубли с неразрывными пробелами", () => {
    expect(formatRub(187_000)).toBe(`1${NBSP}870${NBSP}₽`);
    expect(formatRub(90_000)).toBe(`900${NBSP}₽`);
    expect(formatRub(0)).toBe(`0${NBSP}₽`);
  });

  it("показывает копейки, только если они есть", () => {
    expect(formatRub(187_050)).toBe(`1${NBSP}870,50${NBSP}₽`);
  });

  it("не принимает дробные копейки", () => {
    expect(() => formatRub(10.5)).toThrow();
  });
});

describe("plural", () => {
  const forms = ["блюдо", "блюда", "блюд"] as const;
  it.each([
    [1, "блюдо"],
    [2, "блюда"],
    [5, "блюд"],
    [11, "блюд"],
    [14, "блюд"],
    [21, "блюдо"],
    [22, "блюда"],
    [111, "блюд"],
  ])("%i → %s", (n, expected) => {
    expect(plural(n, forms)).toBe(expected);
  });
});
