/**
 * Демо-наполнение. Запуск: npm run db:seed (повторный запуск безопасен — записи обновляются по slug/id).
 * Ничего не удаляет: блюда, которых нет в списке, остаются как есть (история заказов не ломается).
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { restaurant } from "../src/config/restaurant";
import { categories, dishes, modifierGroups } from "./seed-data/menu";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL не задан");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function seedSettings() {
  const r = restaurant;
  const data = {
    name: r.name,
    tagline: r.tagline,
    description: r.description,
    legalName: r.legalName,
    city: r.city,
    addressFull: r.address.full,
    addressShort: r.address.short,
    metro: r.address.metro,
    parking: r.address.parking,
    lat: r.address.lat,
    lng: r.address.lng,
    timezone: r.timezone,
    phoneDisplay: r.contacts.phoneDisplay,
    phoneE164: r.contacts.phoneE164,
    email: r.contacts.email,
    telegramUrl: r.contacts.telegram,
    whatsappUrl: r.contacts.whatsapp,
    vkUrl: r.contacts.vk,
    openingHours: r.hours,
    orderHours: r.orderHours,
    topBarItems: [
      "Бесплатная доставка от 2 500 ₽",
      `Привезём за ${r.delivery.etaMinutes.from}–${r.delivery.etaMinutes.to} мин`,
      "Заказ от 900 ₽",
      `Возвращаем ${r.bonus.earnPercent} % бонусами`,
    ],
    etaFromMin: r.delivery.etaMinutes.from,
    etaToMin: r.delivery.etaMinutes.to,
    bonusEarnPercent: r.bonus.earnPercent,
    bonusMaxSpendPercent: r.bonus.maxSpendPercent,
    scheduleStepMinutes: r.scheduling.stepMinutes,
    scheduleLeadMinutes: r.scheduling.leadMinutes,
    scheduleDaysAhead: r.scheduling.daysAhead,
  };
  // Настройки создаются один раз: правки из админ-панели повторный сид не затирает.
  await prisma.settings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: {} });
}

async function seedMenu() {
  const categoryIds = new Map<string, string>();
  for (const [i, c] of categories.entries()) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, kanji: c.kanji, sortOrder: i * 10 },
      update: { name: c.name, kanji: c.kanji, sortOrder: i * 10 },
    });
    categoryIds.set(c.slug, row.id);
  }

  for (const g of modifierGroups) {
    await prisma.modifierGroup.upsert({
      where: { id: g.id },
      create: { id: g.id, name: g.name, minSelect: g.minSelect, maxSelect: g.maxSelect },
      update: { name: g.name, minSelect: g.minSelect, maxSelect: g.maxSelect },
    });
    for (const [i, m] of g.modifiers.entries()) {
      await prisma.modifier.upsert({
        where: { id: m.id },
        create: { id: m.id, groupId: g.id, name: m.name, price: m.price, sortOrder: i * 10 },
        update: { groupId: g.id, name: m.name, price: m.price, sortOrder: i * 10 },
      });
    }
  }

  const sortInCategory = new Map<string, number>();
  for (const d of dishes) {
    const categoryId = categoryIds.get(d.category);
    if (!categoryId) throw new Error(`Нет категории ${d.category} для ${d.slug}`);
    const order = (sortInCategory.get(d.category) ?? 0) + 10;
    sortInCategory.set(d.category, order);
    const data = {
      categoryId,
      name: d.name,
      description: d.description,
      composition: d.composition,
      portion: d.portion,
      weightGrams: d.weightGrams ?? null,
      volumeMl: d.volumeMl ?? null,
      kcal: d.kcal,
      proteins: d.proteins,
      fats: d.fats,
      carbs: d.carbs,
      allergens: d.allergens,
      spiciness: d.spiciness ?? 0,
      price: d.price,
      oldPrice: d.oldPrice ?? null,
      kanji: d.kanji ?? null,
      isHit: d.isHit ?? false,
      isNew: d.isNew ?? false,
      isVegan: d.isVegan ?? false,
      isGlutenFree: d.isGlutenFree ?? false,
      isAvailable: d.isAvailable ?? true,
      sortOrder: order,
      deletedAt: null,
    };
    const dish = await prisma.dish.upsert({
      where: { slug: d.slug },
      create: { slug: d.slug, ...data },
      update: data,
    });
    await prisma.dishModifierGroup.deleteMany({ where: { dishId: dish.id } });
    if (d.groups?.length) {
      await prisma.dishModifierGroup.createMany({
        data: d.groups.map((groupId, i) => ({ dishId: dish.id, groupId, sortOrder: i * 10 })),
      });
    }
  }
}

async function main() {
  await seedSettings();
  await seedMenu();
  const [c, d, g] = await Promise.all([prisma.category.count(), prisma.dish.count(), prisma.modifierGroup.count()]);
  console.log(`Готово: категорий ${c}, блюд ${d}, групп добавок ${g}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
