import { describe, expect, it } from "vitest";
import { circlePolygon, pointInPolygon } from "@/lib/geo/polygon";
import {
  calculateQuote,
  evaluatePromo,
  findZone,
  promoDiscount,
  type CatalogDish,
  type Promo,
  type QuoteContext,
  type Zone,
} from "@/lib/order/calc";

const center = { lat: 55.7647, lng: 37.6406 };
const near = { lat: 55.7626, lng: 37.6352 }; // ~0,4 км
const mid = { lat: 55.7738, lng: 37.6799 }; // ~2,7 км
const far = { lat: 55.6339, lng: 37.5153 }; // ~16 км

const zones: Zone[] = [
  {
    id: "z1",
    name: "Центр",
    polygon: circlePolygon(center, 2.2),
    fee: 15_000,
    minOrder: 90_000,
    freeFrom: 250_000,
    etaMinutes: 40,
    isActive: true,
    sortOrder: 0,
  },
  {
    id: "z2",
    name: "Кольцо",
    polygon: circlePolygon(center, 4.5),
    fee: 25_000,
    minOrder: 120_000,
    freeFrom: 350_000,
    etaMinutes: 55,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "z3",
    name: "Выключена",
    polygon: circlePolygon(center, 30),
    fee: 0,
    minOrder: 0,
    freeFrom: null,
    etaMinutes: 90,
    isActive: false,
    sortOrder: 2,
  },
];

const ramen: CatalogDish = {
  id: "ramen",
  name: "Тонкоцу рамен",
  price: 69_000,
  isAvailable: true,
  groups: [
    {
      id: "g-top",
      name: "Добавки",
      minSelect: 0,
      maxSelect: 3,
      modifiers: [{ id: "egg", name: "Яйцо", price: 9_000, isAvailable: true }],
    },
  ],
};
const wok: CatalogDish = {
  id: "wok",
  name: "Вок",
  price: 64_000,
  isAvailable: true,
  groups: [
    {
      id: "g-base",
      name: "Основа",
      minSelect: 1,
      maxSelect: 1,
      modifiers: [
        { id: "udon", name: "Удон", price: 0, isAvailable: true },
        { id: "soba", name: "Соба", price: 4_000, isAvailable: true },
      ],
    },
  ],
};
const eel: CatalogDish = { id: "eel", name: "Ролл с угрём", price: 72_000, isAvailable: false, groups: [] };

const promo10: Promo = {
  id: "p1",
  code: "ОГОНЬ10",
  type: "PERCENT",
  value: 10,
  minOrder: null,
  startsAt: null,
  endsAt: null,
  usageLimit: null,
  usedCount: 0,
  isActive: true,
};

function ctx(over: Partial<QuoteContext> = {}): QuoteContext {
  return {
    dishes: new Map([ramen, wok, eel].map((d) => [d.id, d])),
    zones,
    promo: null,
    now: new Date("2026-11-15T12:00:00Z"),
    bonus: null,
    ...over,
  };
}

describe("геометрия зон", () => {
  it("точка в многоугольнике", () => {
    const ring = circlePolygon(center, 2.2);
    expect(pointInPolygon(near, ring)).toBe(true);
    expect(pointInPolygon(mid, ring)).toBe(false);
    expect(pointInPolygon(far, ring)).toBe(false);
  });

  it("зона с меньшим порядком важнее, выключенные зоны не считаются", () => {
    expect(findZone(near, zones)?.id).toBe("z1");
    expect(findZone(mid, zones)?.id).toBe("z2");
    expect(findZone(far, zones)).toBeNull();
  });
});

describe("сумма заказа", () => {
  it("считается только по ценам из базы", () => {
    // Даже если клиент пришлёт свою цену, во входе её просто нет: только id, добавки и количество.
    const forged = { dishId: "ramen", modifierIds: ["egg"], qty: 2, price: 1 } as unknown as {
      dishId: string;
      modifierIds: string[];
      qty: number;
    };
    const q = calculateQuote({ items: [forged], type: "PICKUP" }, ctx());
    expect(q.subtotal).toBe((69_000 + 9_000) * 2);
    expect(q.total).toBe(156_000);
    expect(q.canOrder).toBe(true);
  });

  it("обязательные добавки и стоп-лист блокируют заказ", () => {
    const q = calculateQuote(
      {
        items: [
          { dishId: "wok", modifierIds: [], qty: 1 },
          { dishId: "eel", modifierIds: [], qty: 1 },
        ],
        type: "PICKUP",
      },
      ctx(),
    );
    expect(q.canOrder).toBe(false);
    expect(q.issues.map((i) => i.code)).toEqual(["MODIFIERS_INVALID", "DISH_UNAVAILABLE"]);
  });

  it("неизвестное блюдо и странное количество", () => {
    const q = calculateQuote(
      {
        items: [
          { dishId: "nope", modifierIds: [], qty: 1 },
          { dishId: "ramen", modifierIds: [], qty: 0 },
          { dishId: "ramen", modifierIds: [], qty: 1.5 },
        ],
        type: "PICKUP",
      },
      ctx(),
    );
    expect(q.issues.map((i) => i.code)).toEqual(["DISH_NOT_FOUND", "QTY_INVALID", "QTY_INVALID"]);
  });

  it("пустая корзина", () => {
    expect(calculateQuote({ items: [], type: "PICKUP" }, ctx()).issues[0]?.code).toBe("EMPTY");
  });
});

describe("доставка", () => {
  const two = [{ dishId: "ramen", modifierIds: [], qty: 2 }]; // 1 380 ₽

  it("стоимость, остаток до бесплатной доставки и до минимума", () => {
    const q = calculateQuote({ items: two, type: "DELIVERY", point: near }, ctx());
    expect(q.delivery).toMatchObject({ fee: 15_000, remainingToFree: 112_000, remainingToMin: 0 });
    expect(q.total).toBe(138_000 + 15_000);
  });

  it("бесплатно от порога", () => {
    const q = calculateQuote(
      { items: [{ dishId: "ramen", modifierIds: [], qty: 4 }], type: "DELIVERY", point: near },
      ctx(),
    );
    expect(q.delivery?.fee).toBe(0);
    expect(q.delivery?.remainingToFree).toBe(0);
  });

  it("ниже минимальной суммы — нельзя оформить", () => {
    const q = calculateQuote(
      { items: [{ dishId: "ramen", modifierIds: [], qty: 1 }], type: "DELIVERY", point: mid },
      ctx(),
    );
    expect(q.canOrder).toBe(false);
    expect(q.issues[0]).toMatchObject({ code: "BELOW_MIN_ORDER" });
    expect(q.delivery?.remainingToMin).toBe(120_000 - 69_000);
  });

  it("адрес вне зон не даёт оформить доставку", () => {
    const q = calculateQuote({ items: two, type: "DELIVERY", point: far }, ctx());
    expect(q.canOrder).toBe(false);
    expect(q.issues[0]?.code).toBe("OUT_OF_ZONE");
    expect(q.delivery).toBeNull();
  });

  it("доставка без адреса", () => {
    expect(calculateQuote({ items: two, type: "DELIVERY" }, ctx()).issues[0]?.code).toBe("ADDRESS_REQUIRED");
  });
});

describe("промокоды", () => {
  const now = new Date("2026-11-15T12:00:00Z");

  it("процент округляется вниз до рубля, сумма не больше корзины", () => {
    expect(promoDiscount(promo10, 138_050)).toBe(13_800);
    expect(promoDiscount({ ...promo10, type: "FIXED", value: 30_000 }, 20_000)).toBe(20_000);
  });

  it("применяется к заказу", () => {
    const q = calculateQuote(
      { items: [{ dishId: "ramen", modifierIds: [], qty: 2 }], type: "PICKUP", promoCode: " огонь10 " },
      ctx({ promo: promo10 }),
    );
    expect(q.promo).toMatchObject({ applied: true, code: "ОГОНЬ10" });
    expect(q.discount).toBe(13_800);
    expect(q.total).toBe(138_000 - 13_800);
  });

  it("условия промокода", () => {
    expect(evaluatePromo(null, "XYZ", 100_000, now)?.applied).toBe(false);
    expect(evaluatePromo({ ...promo10, isActive: false }, "ОГОНЬ10", 100_000, now)?.applied).toBe(false);
    expect(evaluatePromo({ ...promo10, endsAt: new Date("2026-11-01") }, "ОГОНЬ10", 100_000, now)?.message).toMatch(
      /закончился/,
    );
    expect(evaluatePromo({ ...promo10, startsAt: new Date("2026-12-01") }, "ОГОНЬ10", 100_000, now)?.message).toMatch(
      /не начал/,
    );
    expect(evaluatePromo({ ...promo10, usageLimit: 5, usedCount: 5 }, "ОГОНЬ10", 100_000, now)?.message).toMatch(
      /израсходован/,
    );
    expect(evaluatePromo({ ...promo10, minOrder: 150_000 }, "ОГОНЬ10", 100_000, now)?.message).toMatch(/от 1500 ₽/);
  });

  it("неприменённый промокод не блокирует заказ", () => {
    const q = calculateQuote(
      { items: [{ dishId: "ramen", modifierIds: [], qty: 1 }], type: "PICKUP", promoCode: "НЕТТАКОГО" },
      ctx(),
    );
    expect(q.canOrder).toBe(true);
    expect(q.discount).toBe(0);
  });
});

describe("бонусы", () => {
  it("списание ограничено балансом и долей от суммы", () => {
    const items = [{ dishId: "ramen", modifierIds: [], qty: 2 }]; // 1 380 ₽
    const withBonus = (balance: number, want: number) =>
      calculateQuote({ items, type: "PICKUP", bonusToSpend: want }, ctx({ bonus: { balance, maxSpendPercent: 30 } }));
    expect(withBonus(100_000, 100_000).bonusSpent).toBe(41_400);
    expect(withBonus(10_000, 100_000).bonusSpent).toBe(10_000);
    expect(calculateQuote({ items, type: "PICKUP", bonusToSpend: 10_000 }, ctx()).bonusSpent).toBe(0);
  });
});
