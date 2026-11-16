import "server-only";
import { lineKey, type CartLine } from "@/lib/cart/core";
import { findZone } from "@/lib/order/calc";
import { issueAddressToken } from "@/server/address-token";
import { db } from "@/server/db";
import { getZones } from "@/server/zones";

/** История заказов гостя (последние 30). */
export async function userOrders(userId: string) {
  return db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      number: true,
      publicToken: true,
      type: true,
      status: true,
      total: true,
      bonusSpent: true,
      bonusEarned: true,
      createdAt: true,
      items: { select: { name: true, quantity: true } },
      review: { select: { id: true } },
    },
  });
}

export async function userBonusHistory(userId: string) {
  return db.bonusTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, type: true, amount: true, comment: true, createdAt: true },
  });
}

/** Сохранённые адреса с подписью: в оформлении их можно выбрать без повторного поиска. */
export async function userAddresses(userId: string) {
  const [rows, zones] = await Promise.all([
    db.address.findMany({ where: { userId }, orderBy: [{ lastUsedAt: "desc" }, { createdAt: "desc" }], take: 10 }),
    getZones(),
  ]);
  return rows.map((a) => {
    const zone = findZone({ lat: a.lat, lng: a.lng }, zones.filter((z) => z.isActive));
    return {
      id: a.id,
      label: a.label,
      text: a.text,
      apartment: a.apartment,
      entrance: a.entrance,
      floor: a.floor,
      intercom: a.intercom,
      token: issueAddressToken({ value: a.text, lat: a.lat, lng: a.lng }),
      zone: zone
        ? { id: zone.id, name: zone.name, fee: zone.fee, minOrder: zone.minOrder, freeFrom: zone.freeFrom, etaMinutes: zone.etaMinutes }
        : null,
    };
  });
}

export type SavedAddress = Awaited<ReturnType<typeof userAddresses>>[number];

/** Адрес доставки запоминается в кабинете (без дублей по тексту). */
export async function rememberAddress(
  userId: string,
  a: { text: string; lat: number; lng: number; apartment?: string | null; entrance?: string | null; floor?: string | null; intercom?: string | null },
) {
  const details = { apartment: a.apartment ?? null, entrance: a.entrance ?? null, floor: a.floor ?? null, intercom: a.intercom ?? null };
  const existing = await db.address.findFirst({ where: { userId, text: a.text }, select: { id: true } });
  if (existing) {
    await db.address.update({ where: { id: existing.id }, data: { ...details, lat: a.lat, lng: a.lng, lastUsedAt: new Date() } });
  } else {
    await db.address.create({ data: { userId, text: a.text, lat: a.lat, lng: a.lng, ...details, lastUsedAt: new Date() } });
  }
}

/**
 * «Повторить заказ»: строки корзины по сегодняшнему меню. Блюда из стоп-листа, удалённые
 * и с исчезнувшими добавками пропускаются — гость видит, что именно не вошло.
 */
export async function repeatOrderLines(userId: string, orderId: string): Promise<{ lines: CartLine[]; skipped: string[] } | null> {
  const order = await db.order.findFirst({
    where: { id: orderId, userId },
    select: { items: { select: { dishId: true, name: true, quantity: true, modifiers: { select: { modifierId: true } } } } },
  });
  if (!order) return null;
  const dishIds = order.items.flatMap((i) => (i.dishId ? [i.dishId] : []));
  const dishes = await db.dish.findMany({
    where: { id: { in: dishIds }, deletedAt: null, isAvailable: true, category: { isHidden: false } },
    include: { modifierGroups: { include: { group: { include: { modifiers: true } } } } },
  });
  const byId = new Map(dishes.map((d) => [d.id, d]));
  const lines: CartLine[] = [];
  const skipped: string[] = [];
  for (const item of order.items) {
    const dish = item.dishId ? byId.get(item.dishId) : undefined;
    if (!dish) {
      skipped.push(item.name);
      continue;
    }
    const groups = dish.modifierGroups.map((g) => g.group);
    const allMods = new Map(groups.flatMap((g) => g.modifiers.map((m) => [m.id, { ...m, groupId: g.id }] as const)));
    const chosen = item.modifiers.map((m) => (m.modifierId ? allMods.get(m.modifierId) : undefined));
    const valid =
      chosen.every((m) => m && m.isAvailable) &&
      groups.every((g) => {
        const n = chosen.filter((m) => m?.groupId === g.id).length;
        return n >= g.minSelect && n <= g.maxSelect;
      });
    if (!valid) {
      skipped.push(item.name);
      continue;
    }
    const modifiers = chosen.map((m) => ({ id: m!.id, name: m!.name, price: m!.price }));
    lines.push({
      key: lineKey(dish.id, modifiers),
      dishId: dish.id,
      slug: dish.slug,
      name: dish.name,
      unitPrice: dish.price + modifiers.reduce((s, m) => s + m.price, 0),
      qty: item.quantity,
      imageUrl: dish.imageUrl,
      kanji: dish.kanji,
      modifiers,
    });
  }
  return { lines, skipped };
}
