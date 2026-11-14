import { describe, expect, it } from "vitest";
import {
  defaultSelection,
  groupRuleHint,
  requiresChoice,
  unitPrice,
  validateModifierSelection,
} from "@/lib/menu/pricing";
import type { MenuModifierGroup } from "@/lib/menu/types";

const base: MenuModifierGroup = {
  id: "g-base",
  name: "Основа",
  minSelect: 1,
  maxSelect: 1,
  modifiers: [
    { id: "udon", name: "Удон", price: 0, isAvailable: true },
    { id: "soba", name: "Соба", price: 4_000, isAvailable: true },
    { id: "rice", name: "Рис", price: 0, isAvailable: false },
  ],
};
const extra: MenuModifierGroup = {
  id: "g-extra",
  name: "Добавки",
  minSelect: 0,
  maxSelect: 2,
  modifiers: [
    { id: "chicken", name: "Курица", price: 15_000, isAvailable: true },
    { id: "shrimp", name: "Креветки", price: 25_000, isAvailable: true },
    { id: "tofu", name: "Тофу", price: 12_000, isAvailable: true },
  ],
};
const groups = [base, extra];

describe("выбор добавок", () => {
  it("принимает корректный выбор и считает цену", () => {
    const r = validateModifierSelection(groups, ["soba", "chicken", "shrimp"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(unitPrice(64_000, r.modifiers)).toBe(64_000 + 4_000 + 15_000 + 25_000);
    expect(r.modifiers.map((m) => m.groupName)).toEqual(["Основа", "Добавки", "Добавки"]);
  });

  it("требует обязательную группу", () => {
    const r = validateModifierSelection(groups, ["chicken"]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toContainEqual({ groupId: "g-base", message: "Выберите: основа" });
  });

  it("не даёт превысить максимум", () => {
    const r = validateModifierSelection(groups, ["udon", "chicken", "shrimp", "tofu"]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toContainEqual({ groupId: "g-extra", message: "Можно выбрать не больше 2" });
  });

  it("отклоняет чужие, недоступные и повторные добавки", () => {
    expect(validateModifierSelection(groups, ["udon", "foie-gras"]).ok).toBe(false);
    expect(validateModifierSelection(groups, ["rice"]).ok).toBe(false);
    expect(validateModifierSelection(groups, ["udon", "chicken", "chicken"]).ok).toBe(false);
  });

  it("блюдо без групп — пустой выбор корректен", () => {
    expect(validateModifierSelection([], [])).toEqual({ ok: true, modifiers: [] });
  });
});

describe("подсказки и значения по умолчанию", () => {
  it("правила групп", () => {
    expect(groupRuleHint(base)).toBe("Выберите один вариант");
    expect(groupRuleHint(extra)).toBe("По желанию, до 2");
    expect(groupRuleHint({ minSelect: 0, maxSelect: 1 })).toBe("По желанию");
    expect(groupRuleHint({ minSelect: 1, maxSelect: 3 })).toBe("Обязательно, до 3");
  });

  it("обязательный выбор и выбор по умолчанию", () => {
    expect(requiresChoice(groups)).toBe(true);
    expect(requiresChoice([extra])).toBe(false);
    expect(defaultSelection(groups)).toEqual(["udon"]);
  });
});
