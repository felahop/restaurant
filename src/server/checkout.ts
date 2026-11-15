import "server-only";
import { normalizePromoCode, type CatalogDish, type QuoteContext, type QuoteItem } from "@/lib/order/calc";
import { availableSlots, isOpenAt, nextOpening } from "@/lib/order/schedule";
import { verifyAddressToken } from "@/server/address-token";
import { db } from "@/server/db";
import { getSettings } from "@/server/settings";
import { getZones } from "@/server/zones";

/** Блюда для расчёта — всегда свежие из базы (стоп-лист и цены не берём из кэша). */
async function loadDishes(ids: string[]): Promise<Map<string, CatalogDish>> {
  if (!ids.length) return new Map();
  const rows = await db.dish.findMany({
    where: { id: { in: ids }, deletedAt: null, category: { isHidden: false } },
    include: {
      modifierGroups: {
        orderBy: { sortOrder: "asc" },
        include: { group: { include: { modifiers: { orderBy: { sortOrder: "asc" } } } } },
      },
    },
  });
  return new Map(
    rows.map((d) => [
      d.id,
      {
        id: d.id,
        name: d.name,
        price: d.price,
        isAvailable: d.isAvailable,
        groups: d.modifierGroups.map(({ group }) => ({
          id: group.id,
          name: group.name,
          minSelect: group.minSelect,
          maxSelect: group.maxSelect,
          modifiers: group.modifiers.map((m) => ({
            id: m.id,
            name: m.name,
            price: m.price,
            isAvailable: m.isAvailable,
          })),
        })),
      },
    ]),
  );
}

export async function loadQuoteContext(
  items: QuoteItem[],
  promoCode: string | null | undefined,
  now: Date,
): Promise<QuoteContext> {
  const code = promoCode ? normalizePromoCode(promoCode) : "";
  const [dishes, zones, promo] = await Promise.all([
    loadDishes([...new Set(items.map((i) => i.dishId))]),
    getZones(),
    code ? db.promoCode.findUnique({ where: { code } }) : Promise.resolve(null),
  ]);
  return { dishes, zones, promo, now, bonus: null };
}

export function pointFromToken(token: string | null | undefined) {
  if (!token) return null;
  return verifyAddressToken(token);
}

export type ScheduleInfo = {
  ordersPaused: boolean;
  isOpenNow: boolean;
  asapAvailable: boolean;
  nextOpeningLabel: string | null;
  slots: { value: string; label: string }[];
  pickupMinutes: number;
  etaFrom: number;
  etaTo: number;
};

export async function scheduleInfo(now: Date): Promise<ScheduleInfo> {
  const s = await getSettings();
  const opts = {
    hours: s.orderHours,
    timeZone: s.timezone,
    now,
    stepMinutes: s.scheduleStepMinutes,
    leadMinutes: s.scheduleLeadMinutes,
    daysAhead: s.scheduleDaysAhead,
  };
  const isOpenNow = isOpenAt(s.orderHours, s.timezone, now);
  return {
    ordersPaused: s.ordersPaused,
    isOpenNow,
    asapAvailable: isOpenNow && !s.ordersPaused,
    nextOpeningLabel: nextOpening(s.orderHours, s.timezone, now)?.label ?? null,
    slots: s.ordersPaused ? [] : availableSlots(opts).map(({ value, label }) => ({ value, label })),
    pickupMinutes: s.pickupMinutes,
    etaFrom: s.etaFromMin,
    etaTo: s.etaToMin,
  };
}
