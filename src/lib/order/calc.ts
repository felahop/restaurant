/**
 * Расчёт заказа. Чистая функция: на вход — состав корзины (только id и количество) и данные из базы,
 * на выход — суммы и список проблем. Цены из браузера здесь не участвуют.
 */
import { pointInPolygon, type LatLng, type PolygonRing } from "@/lib/geo/polygon";
import { unitPrice, validateModifierSelection, type ChosenModifier } from "@/lib/menu/pricing";
import type { MenuModifierGroup } from "@/lib/menu/types";

export const MAX_LINES = 50;
export const MAX_QTY = 99;

export type CatalogDish = {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  groups: MenuModifierGroup[];
};

export type Zone = {
  id: string;
  name: string;
  polygon: PolygonRing;
  fee: number;
  minOrder: number;
  freeFrom: number | null;
  etaMinutes: number;
  isActive: boolean;
  sortOrder: number;
};

export type Promo = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minOrder: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
};

export type QuoteItem = { dishId: string; modifierIds: string[]; qty: number };

export type QuoteInput = {
  items: QuoteItem[];
  type: "DELIVERY" | "PICKUP";
  point?: LatLng | null;
  promoCode?: string | null;
  /** Сколько бонусов гость хочет списать (копейки). */
  bonusToSpend?: number;
};

export type QuoteContext = {
  dishes: Map<string, CatalogDish>;
  zones: Zone[];
  promo: Promo | null;
  now: Date;
  /** null — гость не вошёл, бонусы недоступны. */
  bonus: { balance: number; maxSpendPercent: number } | null;
};

export type IssueCode =
  | "EMPTY"
  | "TOO_MANY_LINES"
  | "DISH_NOT_FOUND"
  | "DISH_UNAVAILABLE"
  | "MODIFIERS_INVALID"
  | "QTY_INVALID"
  | "ADDRESS_REQUIRED"
  | "OUT_OF_ZONE"
  | "BELOW_MIN_ORDER";

export type Issue = { code: IssueCode; message: string; itemIndex?: number };

export type QuoteLine = {
  dishId: string;
  name: string;
  qty: number;
  basePrice: number;
  unitPrice: number;
  lineTotal: number;
  modifiers: ChosenModifier[];
};

export type QuoteResult = {
  lines: QuoteLine[];
  issues: Issue[];
  subtotal: number;
  discount: number;
  promo: { code: string; applied: boolean; message: string; promoId?: string } | null;
  delivery: {
    zone: { id: string; name: string; etaMinutes: number } | null;
    fee: number;
    minOrder: number;
    freeFrom: number | null;
    remainingToMin: number;
    remainingToFree: number | null;
  } | null;
  bonusSpent: number;
  total: number;
  canOrder: boolean;
};

export function findZone(point: LatLng, zones: Zone[]): Zone | null {
  return (
    [...zones]
      .filter((z) => z.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .find((z) => pointInPolygon(point, z.polygon)) ?? null
  );
}

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

/** Скидка по промокоду или причина, почему он не применился. Процент округляем вниз до рубля. */
export function evaluatePromo(promo: Promo | null, code: string, subtotal: number, now: Date): QuoteResult["promo"] {
  const normalized = normalizePromoCode(code);
  if (!normalized) return null;
  const fail = (message: string) => ({ code: normalized, applied: false, message });
  if (!promo || promo.code !== normalized || !promo.isActive) return fail("Такого промокода нет или он выключен");
  if (promo.startsAt && now < promo.startsAt) return fail("Промокод ещё не начал действовать");
  if (promo.endsAt && now > promo.endsAt) return fail("Срок действия промокода закончился");
  if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) return fail("Промокод уже израсходован");
  if (promo.minOrder != null && subtotal < promo.minOrder)
    return fail(`Промокод действует от ${Math.ceil(promo.minOrder / 100)} ₽ в корзине`);
  return { code: normalized, applied: true, message: "Промокод применён", promoId: promo.id };
}

export function promoDiscount(promo: Promo, subtotal: number): number {
  if (promo.type === "PERCENT") {
    const pct = Math.max(0, Math.min(100, promo.value));
    return Math.min(subtotal, Math.floor((subtotal * pct) / 100 / 100) * 100);
  }
  return Math.max(0, Math.min(subtotal, promo.value));
}

export function calculateQuote(input: QuoteInput, ctx: QuoteContext): QuoteResult {
  const issues: Issue[] = [];
  const lines: QuoteLine[] = [];

  if (input.items.length === 0) issues.push({ code: "EMPTY", message: "В корзине пока пусто" });
  if (input.items.length > MAX_LINES)
    issues.push({ code: "TOO_MANY_LINES", message: "Слишком много позиций в заказе" });

  input.items.slice(0, MAX_LINES).forEach((item, itemIndex) => {
    const dish = ctx.dishes.get(item.dishId);
    if (!dish) {
      issues.push({ code: "DISH_NOT_FOUND", message: "Этого блюда больше нет в меню", itemIndex });
      return;
    }
    if (!dish.isAvailable) {
      issues.push({
        code: "DISH_UNAVAILABLE",
        message: `«${dish.name}» закончилось — уберите его из заказа`,
        itemIndex,
      });
      return;
    }
    if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > MAX_QTY) {
      issues.push({ code: "QTY_INVALID", message: `Проверьте количество: «${dish.name}»`, itemIndex });
      return;
    }
    const selection = validateModifierSelection(dish.groups, item.modifierIds);
    if (!selection.ok) {
      issues.push({
        code: "MODIFIERS_INVALID",
        message: `«${dish.name}»: ${selection.errors[0]?.message ?? "проверьте добавки"}`,
        itemIndex,
      });
      return;
    }
    const price = unitPrice(dish.price, selection.modifiers);
    lines.push({
      dishId: dish.id,
      name: dish.name,
      qty: item.qty,
      basePrice: dish.price,
      unitPrice: price,
      lineTotal: price * item.qty,
      modifiers: selection.modifiers,
    });
  });

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);

  // Промокод
  let discount = 0;
  const promo = input.promoCode ? evaluatePromo(ctx.promo, input.promoCode, subtotal, ctx.now) : null;
  if (promo?.applied && ctx.promo) discount = promoDiscount(ctx.promo, subtotal);

  // Доставка
  let delivery: QuoteResult["delivery"] = null;
  if (input.type === "DELIVERY") {
    if (!input.point) {
      issues.push({ code: "ADDRESS_REQUIRED", message: "Укажите адрес доставки" });
    } else {
      const zone = findZone(input.point, ctx.zones);
      if (!zone) {
        issues.push({
          code: "OUT_OF_ZONE",
          message: "Сюда пока не доставляем. Заберите заказ сами — приготовим к вашему приходу.",
        });
      } else {
        // Минимальная сумма и порог бесплатной доставки считаются по блюдам до скидок.
        const free = zone.freeFrom != null && subtotal >= zone.freeFrom;
        const remainingToMin = Math.max(0, zone.minOrder - subtotal);
        delivery = {
          zone: { id: zone.id, name: zone.name, etaMinutes: zone.etaMinutes },
          fee: free ? 0 : zone.fee,
          minOrder: zone.minOrder,
          freeFrom: zone.freeFrom,
          remainingToMin,
          remainingToFree: zone.freeFrom == null ? null : Math.max(0, zone.freeFrom - subtotal),
        };
        if (remainingToMin > 0 && lines.length > 0) {
          issues.push({
            code: "BELOW_MIN_ORDER",
            message: `Минимальный заказ в эту зону — ${Math.ceil(zone.minOrder / 100)} ₽. Добавьте ещё на ${Math.ceil(remainingToMin / 100)} ₽.`,
          });
        }
      }
    }
  }

  // Бонусы: не больше доли от суммы блюд после скидки и не больше баланса.
  let bonusSpent = 0;
  if (ctx.bonus && input.bonusToSpend && input.bonusToSpend > 0) {
    const cap = Math.floor(((subtotal - discount) * ctx.bonus.maxSpendPercent) / 100 / 100) * 100;
    bonusSpent = Math.max(0, Math.min(Math.trunc(input.bonusToSpend), ctx.bonus.balance, cap));
  }

  const fee = delivery?.fee ?? 0;
  const total = Math.max(0, subtotal - discount - bonusSpent) + fee;

  return {
    lines,
    issues,
    subtotal,
    discount,
    promo,
    delivery,
    bonusSpent,
    total,
    canOrder: issues.length === 0 && lines.length > 0,
  };
}
