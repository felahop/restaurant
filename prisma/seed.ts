/**
 * Демо-наполнение. Запуск: npm run db:seed (повторный запуск безопасен — записи обновляются по slug/id).
 * Ничего не удаляет: блюда, которых нет в списке, остаются как есть (история заказов не ломается).
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { restaurant } from "../src/config/restaurant";
import { randomBytes } from "node:crypto";
import { circlePolygon } from "../src/lib/geo/polygon";
import { hashPassword } from "../src/server/admin/password";
import { categories, dishes, modifierGroups, rub } from "./seed-data/menu";

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

/** Три демо-зоны вокруг ресторана. Порядок важен: при пересечении действует зона с меньшим sortOrder. */
async function seedZones() {
  const center = { lat: restaurant.address.lat, lng: restaurant.address.lng };
  const zones = [
    {
      id: "zone-center",
      name: "Центр",
      color: "#e0a43a",
      radiusKm: 2.2,
      wobble: [0, 0.08, -0.05, 0.1, 0.02, -0.08, 0.05, 0.12],
      fee: rub(150),
      minOrder: rub(900),
      freeFrom: rub(2500),
      etaMinutes: 40,
    },
    {
      id: "zone-ring",
      name: "Внутри ТТК",
      color: "#7a9a5b",
      radiusKm: 4.6,
      wobble: [0.05, -0.04, 0.1, 0, -0.06, 0.08, -0.02, 0.04],
      fee: rub(250),
      minOrder: rub(1200),
      freeFrom: rub(3500),
      etaMinutes: 55,
    },
    {
      id: "zone-far",
      name: "Дальняя зона",
      color: "#a39b90",
      radiusKm: 8.5,
      wobble: [0.1, 0.05, 0.05, 0, -0.05, 0.05, 0.1, 0.12],
      fee: rub(390),
      minOrder: rub(1500),
      freeFrom: null,
      etaMinutes: 75,
    },
  ];
  for (const [i, z] of zones.entries()) {
    const data = {
      name: z.name,
      color: z.color,
      polygon: circlePolygon(center, z.radiusKm, 16, z.wobble),
      fee: z.fee,
      minOrder: z.minOrder,
      freeFrom: z.freeFrom,
      etaMinutes: z.etaMinutes,
      sortOrder: i * 10,
    };
    // Зоны, изменённые в админке, не перезаписываем.
    await prisma.deliveryZone.upsert({ where: { id: z.id }, create: { id: z.id, ...data }, update: {} });
  }
}

async function seedPromos() {
  const promos = [
    { code: "ОГОНЬ10", type: "PERCENT" as const, value: 10, minOrder: null },
    { code: "WELCOME300", type: "FIXED" as const, value: rub(300), minOrder: rub(1500), usageLimit: 100 },
  ];
  for (const p of promos) {
    await prisma.promoCode.upsert({ where: { code: p.code }, create: p, update: {} });
  }
}

/**
 * Сотрудники по умолчанию создаются, только если в базе ещё нет ни одного.
 * Пароли: ADMIN_OWNER_PASSWORD и ADMIN_MANAGER_PASSWORD, иначе генерируются и печатаются один раз.
 */
async function seedAdmins() {
  if ((await prisma.adminUser.count()) > 0) return;
  const accounts = [
    { login: "owner", name: "Владелец", role: "OWNER" as const, env: "ADMIN_OWNER_PASSWORD" },
    { login: "manager", name: "Менеджер смены", role: "MANAGER" as const, env: "ADMIN_MANAGER_PASSWORD" },
  ];
  for (const a of accounts) {
    const password = process.env[a.env] || `${randomBytes(9).toString("base64url")}7`;
    await prisma.adminUser.create({
      data: { login: a.login, name: a.name, role: a.role, passwordHash: await hashPassword(password) },
    });
    if (!process.env[a.env]) console.log(`Сотрудник ${a.login}: пароль ${password} — сохраните и смените в админке.`);
  }
}

/** Демо-отзывы (опубликованы). Создаются один раз. */
async function seedReviews() {
  if ((await prisma.review.count()) > 0) return;
  const reviews = [
    { authorName: "Анна", rating: 5, text: "Тонкоцу как в Фукуоке: бульон густой, яйцо идеальное. Привезли за 40 минут, всё горячее." },
    { authorName: "Дмитрий", rating: 5, text: "Сидели у открытой кухни и смотрели, как работает вок. Мапо тофу честно острое — спасибо, что предупредили." },
    { authorName: "Мария", rating: 4, text: "Бао с грудинкой — любовь. Сет на двоих большой, двоим хватило с запасом. Хочется ещё десертов в меню." },
  ];
  for (const [i, r] of reviews.entries()) {
    const publishedAt = new Date(Date.now() - (i + 1) * 9 * 86_400_000);
    await prisma.review.create({ data: { ...r, isPublished: true, publishedAt, createdAt: publishedAt } });
  }
}

/** Демо-акции для главной. Создаются один раз. */
async function seedPromotions() {
  if ((await prisma.promotion.count()) > 0) return;
  await prisma.promotion.createMany({
    data: [
      { kind: "PROMO", badge: "−20%", title: "Обед с огня", text: "Любой вок и напиток со скидкой 20 % — в зале и на доставку.", period: "Пн–Пт, 12:00–16:00", kanji: "鍋", ctaLabel: "Выбрать вок", ctaHref: "/menu#cat-wok", sortOrder: 10 },
      { kind: "PROMO", badge: "Сет", title: "Ужин на двоих", text: "Два рамена, бао и шесть димсамов за 2 990 ₽ вместо 3 560 ₽.", period: "Каждый день после 18:00", kanji: "宴", ctaLabel: "Заказать сет", ctaHref: "/menu", sortOrder: 20 },
      { kind: "PROMO", badge: "Бонусы", title: "5 % возвращаем бонусами", text: "С каждого оплаченного заказа. Списывайте при следующем — до 30 % суммы.", period: "Для гостей с личным кабинетом", kanji: "味", ctaLabel: "Войти по номеру", ctaHref: "/account", sortOrder: 30 },
    ],
  });
}

async function main() {
  await seedSettings();
  await seedAdmins();
  await seedReviews();
  await seedPromotions();
  await seedMenu();
  await seedZones();
  await seedPromos();
  const [c, d, g, z, p] = await Promise.all([
    prisma.category.count(),
    prisma.dish.count(),
    prisma.modifierGroup.count(),
    prisma.deliveryZone.count(),
    prisma.promoCode.count(),
  ]);
  console.log(`Готово: категорий ${c}, блюд ${d}, групп добавок ${g}, зон ${z}, промокодов ${p}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
