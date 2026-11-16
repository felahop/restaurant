import "dotenv/config";
import pg from "pg";
import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * Этап 7: вход по коду, кабинет, бонусы, бронь, обратная связь, отзывы.
 * SMS-сервиса нет, поэтому сервер для тестов запущен в демо-режиме (ALLOW_DEMO_SMS=true): код показывается на экране.
 */

async function sql<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params: unknown[] = []) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query<T>(text, params)).rows;
  } finally {
    await client.end();
  }
}

/** Уникальный номер для каждого теста: 10 цифр после +7. */
const randomPhone = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;

async function signIn(page: Page, digits: string) {
  await page.goto("/account");
  await page.getByRole("textbox", { name: "Телефон" }).fill(digits);
  await page.getByRole("checkbox", { name: /Согласен на обработку/ }).check();
  await page.getByRole("button", { name: "Получить код" }).click();
  const notice = page.getByRole("status").filter({ hasText: "Ваш код" });
  const code = (await notice.innerText()).match(/(\d{4})\s*$/)![1]!;
  await page.getByLabel("Код из SMS").fill(code);
  await expect(page.getByRole("heading", { name: "Заказы" })).toBeVisible();
}

async function pickupOrder(page: Page, opts: { name?: string; phone?: string; bonus?: boolean } = {}) {
  await page.goto("/");
  await page.getByRole("button", { name: "Добавить в корзину: Тонкоцу рамен" }).click();
  await page.getByRole("button", { name: "Добавить ещё порцию: Тонкоцу рамен" }).click();
  await page.goto("/checkout");
  await page.getByRole("group", { name: "Способ получения" }).getByText("Самовывоз").click();
  if (opts.name) await page.locator("#name").fill(opts.name);
  if (opts.phone) await page.getByRole("textbox", { name: "Телефон" }).fill(opts.phone);
  await page.getByRole("radio", { name: "Наличными" }).check();
  if (opts.bonus) {
    await page.getByRole("checkbox", { name: /Списать бонусы/ }).check();
    await expect(page.getByText("Бонусами", { exact: true })).toBeVisible();
  }
  await page.getByRole("checkbox", { name: /Согласен на обработку/ }).check();
  await page.getByRole("button", { name: /Оформить заказ/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Принят" })).toBeVisible();
  return {
    token: page.url().split("/").pop()!,
    number: (await page.getByText(/^Заказ №\d+$/).innerText()).replace(/\D/g, ""),
  };
}

async function adminPage(browser: Browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/admin/login");
  await page.getByLabel("Логин").fill("manager");
  await page.getByLabel("Пароль").fill(process.env.ADMIN_MANAGER_PASSWORD ?? "");
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL(/\/admin\/orders/);
  return page;
}

test("вход по коду: неверный код не пускает, верный — открывает кабинет", async ({ page }) => {
  await page.goto("/account");
  await page.getByRole("textbox", { name: "Телефон" }).fill(randomPhone());
  await page.getByRole("button", { name: "Получить код" }).click();
  await expect(page.getByText("Нужно согласие на обработку персональных данных")).toBeVisible();

  await page.getByRole("checkbox", { name: /Согласен на обработку/ }).check();
  await page.getByRole("button", { name: "Получить код" }).click();
  const code = (await page.getByRole("status").filter({ hasText: "Ваш код" }).innerText()).match(/(\d{4})\s*$/)![1]!;
  const wrong = code === "0000" ? "1111" : "0000";
  await page.getByLabel("Код из SMS").fill(wrong);
  await expect(page.getByText("Код не подошёл. Проверьте цифры.")).toBeVisible();
  await page.getByLabel("Код из SMS").fill(code);
  await expect(page.getByRole("heading", { name: "Бонусы" })).toBeVisible();

  // Выход возвращает форму входа.
  await page.getByRole("button", { name: "Выйти" }).click();
  await expect(page.getByRole("button", { name: "Получить код" })).toBeVisible();
});

test("кабинет: заказ в истории, «Повторить» собирает корзину заново", async ({ page }) => {
  await signIn(page, randomPhone());
  const order = await pickupOrder(page, { name: "Ольга" });

  await page.goto("/account");
  await expect(page.getByRole("link", { name: new RegExp(`№${order.number}`) })).toBeVisible();
  await page.getByRole("button", { name: `Повторить заказ №${order.number}` }).click();
  await page.waitForURL(/\/checkout/);
  await expect(page.getByRole("link", { name: "Тонкоцу рамен" })).toBeVisible();
  // Имя и телефон подставлены из кабинета.
  await expect(page.locator("#name")).toHaveValue("Ольга");
});

test("бонусы списываются при оформлении и возвращаются при отмене заказа", async ({ page, browser }) => {
  const digits = randomPhone();
  await signIn(page, digits);
  await sql(`UPDATE "User" SET "bonusBalance" = 50000 WHERE "phone" = $1`, [`+7${digits}`]);

  // 2 × 690 ₽ = 1 380 ₽; списать можно до 30 % — 414 ₽.
  const order = await pickupOrder(page, { name: "Бонус", bonus: true });
  await page.goto("/account");
  const bonuses = page.getByRole("region", { name: "Бонусы" });
  await expect(bonuses).toContainText("86");
  await expect(bonuses).toContainText("Списано");

  const id = (await sql<{ id: string }>(`SELECT "id" FROM "Order" WHERE "publicToken" = $1`, [order.token]))[0]!.id;
  expect((await sql<{ total: number; bonusSpent: number }>(`SELECT "total", "bonusSpent" FROM "Order" WHERE "id" = $1`, [id]))[0]).toEqual({
    total: 96_600,
    bonusSpent: 41_400,
  });

  // Ресторан отменяет заказ — бонусы возвращаются гостю.
  const admin = await adminPage(browser);
  await admin.goto(`/admin/orders/${id}`);
  await admin.getByRole("button", { name: "Отменить заказ" }).click();
  await admin.getByLabel(/Причина/).fill("Закончился бульон");
  await admin.getByRole("dialog").getByRole("button", { name: "Отменить заказ" }).click();
  await expect(admin.getByText("Отменён", { exact: true }).first()).toBeVisible();

  await page.reload();
  await expect(bonuses).toContainText("500");
  await expect(bonuses).toContainText("Возвращено");
  await admin.context().close();
});

test("бронь столика: время из списка, подтверждение и запись в админке", async ({ page, browser }) => {
  const name = `Бронь ${Date.now().toString(36)}`;
  await page.goto("/booking");
  const first = page.getByRole("group", { name: "Время", exact: true }).getByRole("button").first();
  // Кнопки времени есть в HTML сразу; повторяем клик, пока страница не оживёт (гидратация).
  await expect(async () => {
    await first.click();
    await expect(first).toHaveAttribute("aria-pressed", "true", { timeout: 500 });
  }).toPass();
  await page.getByRole("button", { name: "Больше гостей" }).click();
  await page.getByLabel("Имя").fill(name);
  await page.getByRole("textbox", { name: "Телефон" }).fill(randomPhone());
  await page.getByRole("checkbox", { name: /Согласен на обработку/ }).check();
  await page.getByRole("button", { name: /Забронировать/ }).click();
  await expect(page.getByRole("heading", { name: "Бронь принята" })).toBeVisible();
  await expect(page.getByText(/3 гостя/)).toBeVisible();

  const admin = await adminPage(browser);
  await admin.goto("/admin/reservations");
  await expect(admin.getByText(name)).toBeVisible();
  await admin.context().close();
});

test("обратная связь: сообщение отправляется", async ({ page }) => {
  await page.goto("/contacts");
  await expect(page.locator('main a[href^="tel:"]').first()).toBeVisible();
  await page.getByRole("button", { name: "Отправить" }).click();
  await expect(page.getByText("Как к вам обращаться?")).toBeVisible();
  await page.getByLabel("Имя").fill("Игорь");
  await page.getByLabel("Телефон или почта").fill("guest@example.com");
  await page.getByLabel("Сообщение").fill("Можно ли заказать банкет на 20 человек?");
  await page.getByRole("checkbox", { name: /Согласен на обработку/ }).check();
  await page.getByRole("button", { name: "Отправить" }).click();
  await expect(page.getByText("Сообщение у нас")).toBeVisible();
});

test("отзыв о выполненном заказе уходит на модерацию", async ({ page }) => {
  const order = await pickupOrder(page, { name: "Мария Тестова", phone: randomPhone() });
  await sql(`UPDATE "Order" SET "status" = 'COMPLETED', "completedAt" = now() WHERE "publicToken" = $1`, [order.token]);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Как вам заказ?" })).toBeVisible();
  await expect(page.getByLabel("Имя для публикации")).toHaveValue("Мария");
  await page.getByRole("radio", { name: /5 из 5/ }).check({ force: true });
  await page.getByLabel("Отзыв").fill("Бульон густой, лапша упругая, привезли горячим.");
  await page.getByRole("button", { name: "Отправить отзыв" }).click();
  await expect(page.getByText("Спасибо! Отзыв появится на сайте после проверки.")).toBeVisible();

  const [review] = await sql<{ isPublished: boolean; rating: number }>(
    `SELECT r."isPublished", r."rating" FROM "Review" r JOIN "Order" o ON o."id" = r."orderId" WHERE o."publicToken" = $1`,
    [order.token],
  );
  expect(review).toEqual({ isPublished: false, rating: 5 });
});
