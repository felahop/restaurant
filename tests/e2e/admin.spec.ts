import "dotenv/config";
import pg from "pg";
import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * Админ-панель глазами владельца и менеджера.
 * Пароли берутся из .env (ADMIN_OWNER_PASSWORD, ADMIN_MANAGER_PASSWORD) — те же, с которыми запускали db:seed.
 */
const OWNER = { login: "owner", password: process.env.ADMIN_OWNER_PASSWORD ?? "" };
const MANAGER = { login: "manager", password: process.env.ADMIN_MANAGER_PASSWORD ?? "" };

test.skip(!OWNER.password || !MANAGER.password, "Нужны ADMIN_OWNER_PASSWORD и ADMIN_MANAGER_PASSWORD в .env");

async function login(page: Page, who: { login: string; password: string }) {
  await page.goto("/admin/login");
  await page.getByLabel("Логин").fill(who.login);
  await page.getByLabel("Пароль").fill(who.password);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL(/\/admin\/orders/);
}

async function adminPage(browser: Browser, who = OWNER) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(page, who);
  return page;
}

/** Местная дата ресторана (Москва), на которую заказ попадает в ленту. */
async function feedDateOf(token: string) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query<{ day: string }>(
      `SELECT to_char(COALESCE("scheduledFor", "createdAt") AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Moscow', 'YYYY-MM-DD') AS day
         FROM "Order" WHERE "publicToken" = $1`,
      [token],
    );
    return rows[0]!.day;
  } finally {
    await client.end();
  }
}

/** Гость оформляет самовывоз с оплатой при получении и попадает на страницу заказа. */
async function guestOrder(page: Page, dish = "Тонкоцу рамен") {
  await page.goto("/");
  await page.getByRole("button", { name: `Добавить в корзину: ${dish}` }).click();
  await page.goto("/checkout");
  await page.getByRole("group", { name: "Способ получения" }).getByText("Самовывоз").click();
  await page.getByLabel("Имя").fill("Гость из теста");
  await page.getByRole("textbox", { name: "Телефон" }).fill("9991234567");
  await page.getByRole("radio", { name: "Наличными" }).check();
  await page.getByRole("checkbox", { name: /Согласен на обработку/ }).check();
  await page.getByRole("button", { name: /Оформить заказ/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Принят" })).toBeVisible();
  const number = (await page.getByText(/^Заказ №\d+$/).innerText()).replace(/\D/g, "");
  return { token: page.url().split("/").pop()!, number };
}

test.describe("вход и роли", () => {
  test("без входа — на страницу входа, API отвечает 401", async ({ page, request }) => {
    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/admin\/login/);
    const res = await request.get("/api/admin/orders");
    expect(res.status()).toBe(401);
  });

  test("неверный пароль не пускает", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Логин").fill("owner");
    await page.getByLabel("Пароль").fill("wrong-password-123");
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page.getByText("Неверный логин или пароль")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("менеджер видит заказы, меню и брони, но не настройки", async ({ page }) => {
    await login(page, MANAGER);
    const nav = page.getByRole("navigation", { name: "Разделы админ-панели" });
    await expect(nav.getByRole("link", { name: "Заказы" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Меню" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Брони" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Настройки" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Аналитика" })).toHaveCount(0);

    await page.goto("/admin/settings");
    await expect(page).toHaveURL(/\/admin\/orders\?denied=1/);
    await expect(page.getByText("Этот раздел доступен только владельцу.")).toBeVisible();
  });

  test("владелец видит аналитику", async ({ page }) => {
    await login(page, OWNER);
    await page.getByRole("navigation", { name: "Разделы админ-панели" }).getByRole("link", { name: "Аналитика" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Аналитика" })).toBeVisible();
    await expect(page.getByText("Средний чек")).toBeVisible();
    await page.getByRole("link", { name: "7 дней" }).click();
    await expect(page.getByRole("heading", { name: "Выручка по дням" })).toBeVisible();
  });
});

test("блюдо из админки появляется в меню, стоп-лист блокирует заказ", async ({ browser, page }, info) => {
  const name = `E2E удон ${info.project.name} ${Date.now().toString(36)}`;
  const admin = await adminPage(browser);

  // 1. Владелец создаёт блюдо — без правок кода.
  await admin.goto("/admin/menu/dishes/new");
  await admin.getByRole("textbox", { name: "Название", exact: true }).fill(name);
  await admin.getByLabel("Категория").selectOption({ index: 1 });
  await admin.getByLabel("Выход для гостя").fill("300 г");
  await admin.getByLabel("Короткое описание").fill("Тестовое блюдо, созданное в админ-панели");
  await admin.getByRole("textbox", { name: "Состав", exact: true }).fill("лапша удон, бульон даси");
  await admin.getByRole("textbox", { name: "Цена, ₽", exact: true }).fill("450");
  await admin.getByRole("button", { name: "Создать блюдо" }).click();
  await admin.waitForURL(/\/admin\/menu\/dishes\/(?!new)[^/]+$/);

  // 2. Гость видит его в меню и кладёт в корзину.
  await page.goto("/menu");
  await page.getByRole("button", { name: `Добавить в корзину: ${name}` }).click();

  // 3. Блюдо закончилось: менеджер ставит его в стоп-лист одним переключателем.
  await admin.goto("/admin/menu");
  const toggle = admin.getByRole("switch", { name: `В продаже: ${name}` });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(admin.getByText(`«${name}» в стоп-листе`)).toBeVisible();

  // 4. В меню блюдо помечено, в корзине — заказ не пройдёт.
  await page.goto("/menu");
  await expect(page.getByRole("button", { name: `${name} закончилось` })).toBeDisabled();
  await page.goto("/checkout");
  await expect(page.getByText(`«${name}» закончилось — уберите его из заказа`)).toBeVisible();

  // Уборка: блюдо удаляется из меню (в истории заказов оно бы осталось).
  admin.once("dialog", (d) => d.accept());
  await admin.getByRole("button", { name: `Удалить: ${name}` }).click();
  await expect(admin.getByRole("switch", { name: `В продаже: ${name}` })).toHaveCount(0);
  await admin.context().close();
});

test("новый заказ появляется в ленте без перезагрузки, гость видит смену статуса", async ({ browser }) => {
  const guestCtx = await browser.newContext();
  const guest = await guestCtx.newPage();
  const admin = await adminPage(browser, MANAGER);

  // Первый заказ подсказывает дату ленты: ночью заказ оформляется ко времени на следующий день.
  const first = await guestOrder(guest);
  await admin.getByLabel("Дата").fill(await feedDateOf(first.token));
  await expect(admin.getByRole("link", { name: `№${first.number}` })).toBeVisible();

  // Второй заказ лента должна подхватить сама (опрос раз в 5 секунд).
  const second = await guestOrder(guest);
  const card = admin.getByRole("listitem").filter({ has: admin.getByRole("link", { name: `№${second.number}` }) });
  await expect(card).toBeVisible({ timeout: 15_000 });
  // «Как можно скорее» — «Новый»; ночью заказ уходит ко времени — «Предзаказ» (сигнал за 2 часа до времени).
  await expect(card.getByText(/^(Новый|Предзаказ|Пора готовить)$/)).toBeVisible();

  // Статус в один тап — гость видит его без перезагрузки.
  await card.getByRole("button", { name: "Готовится →" }).click();
  await expect(card.getByText("Готовится", { exact: true })).toBeVisible();
  await expect(guest.getByRole("heading", { level: 1, name: "Готовится" })).toBeVisible({ timeout: 15_000 });

  // Владелец видит в журнале, кто и что сделал.
  const owner = await adminPage(browser);
  await owner.goto("/admin/journal?section=orders");
  const entry = owner.getByRole("listitem").filter({ hasText: `Заказ №${second.number}: Принят → Готовится` });
  await expect(entry).toBeVisible();
  await expect(entry).toContainText("Менеджер смены");

  await guestCtx.close();
  await admin.context().close();
  await owner.context().close();
});

test("выгрузка CSV — только владельцу, без персональных данных", async ({ browser }) => {
  const owner = await adminPage(browser);
  const res = await owner.request.get("/api/admin/export/orders?period=week");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  const body = await res.text();
  expect(body.startsWith("\uFEFFНомер;Создан;Ко времени;Получение;Статус")).toBe(true);
  expect(body).not.toContain("9991234567");
  expect((await owner.request.get("/api/admin/export/dishes?period=month")).status()).toBe(200);

  const manager = await adminPage(browser, MANAGER);
  expect((await manager.request.get("/api/admin/export/orders?period=week")).status()).toBe(403);
  await owner.context().close();
  await manager.context().close();
});
