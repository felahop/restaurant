import "dotenv/config";
import pg from "pg";
import { expect, test, type Browser, type Page } from "@playwright/test";

/** Возвраты, сигналы в ленте и вместимость зала для броней. */

async function sql<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params: unknown[] = []) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query<T>(text, params)).rows;
  } finally {
    await client.end();
  }
}

async function ownerPage(browser: Browser) {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/admin/login");
  await page.getByLabel("Логин").fill("owner");
  await page.getByLabel("Пароль").fill(process.env.ADMIN_OWNER_PASSWORD ?? "");
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL(/\/admin\/orders/);
  return page;
}

/** Гость оплачивает заказ онлайн (тестовый платёжный сервис). */
async function paidOrder(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Добавить в корзину: Тонкоцу рамен" }).click();
  await page.getByRole("button", { name: "Добавить ещё порцию: Тонкоцу рамен" }).click();
  await page.goto("/checkout");
  await page.getByRole("group", { name: "Способ получения" }).getByText("Самовывоз").click();
  await page.locator("#name").fill("Анна");
  await page.getByRole("textbox", { name: "Телефон" }).fill("9991234567");
  await page.getByRole("radio", { name: "Картой онлайн" }).check();
  await page.getByRole("checkbox", { name: /Согласен на обработку/ }).check();
  await page.getByRole("button", { name: /Перейти к оплате/ }).click();
  await page.getByRole("button", { name: "Оплатить" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Принят" })).toBeVisible();
  const token = page.url().split("/").pop()!;
  const [row] = await sql<{ id: string; number: number }>(`SELECT "id", "number" FROM "Order" WHERE "publicToken" = $1`, [token]);
  return { token, id: row!.id, number: row!.number };
}

async function cancel(admin: Page, orderId: string) {
  await admin.goto(`/admin/orders/${orderId}`);
  await admin.getByRole("button", { name: "Отменить заказ" }).click();
  await admin.getByLabel(/Причина/).fill("Закончился бульон");
  await admin.getByRole("dialog").getByRole("button", { name: "Отменить заказ" }).click();
  await expect(admin.getByText("Отменён", { exact: true }).first()).toBeVisible();
}

test("отмена оплаченного заказа: заявка на возврат, владелец возвращает деньги", async ({ page, browser }) => {
  const order = await paidOrder(page);
  const owner = await ownerPage(browser);
  await cancel(owner, order.id);

  // Гость видит, что ресторан рассмотрит возврат.
  await page.reload();
  await expect(page.getByText("ресторан рассмотрит возврат денег")).toBeVisible();

  await owner.goto("/admin/refunds");
  const item = owner.getByRole("listitem").filter({ has: owner.getByRole("link", { name: `№${order.number}`, exact: true }) });
  await expect(item.getByText("Ждёт решения")).toBeVisible();
  owner.once("dialog", (d) => d.accept());
  await item.getByRole("button", { name: /^Вернуть 1\s380\s₽$/ }).click();
  await expect(item.getByText("Возвращено")).toBeVisible();

  const [row] = await sql<{ paymentStatus: string; refundStatus: string }>(`SELECT "paymentStatus", "refundStatus" FROM "Order" WHERE "id" = $1`, [order.id]);
  expect(row).toEqual({ paymentStatus: "REFUNDED", refundStatus: "SUCCEEDED" });
  await page.reload();
  await expect(page.getByText("Деньги возвращены")).toBeVisible();

  // Решение попало в журнал.
  await owner.goto("/admin/journal?section=refunds");
  await expect(owner.getByText(`за заказ №${order.number}`).first()).toBeVisible();
  await owner.context().close();
});

test("владелец может отказать в возврате — только с причиной", async ({ page, browser }) => {
  const order = await paidOrder(page);
  const owner = await ownerPage(browser);
  await cancel(owner, order.id);
  await owner.goto("/admin/refunds");
  const item = owner.getByRole("listitem").filter({ has: owner.getByRole("link", { name: `№${order.number}`, exact: true }) });
  await item.getByRole("button", { name: "Не возвращать" }).click();
  const dialog = owner.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Сохранить решение" })).toBeDisabled();
  await dialog.getByLabel(/Причина/).fill("Гость забрал заказ, отмена ошибочная");
  await dialog.getByRole("button", { name: "Сохранить решение" }).click();
  await expect(item.getByText("Без возврата", { exact: true })).toBeVisible();
  const [row] = await sql<{ paymentStatus: string; refundStatus: string }>(`SELECT "paymentStatus", "refundStatus" FROM "Order" WHERE "id" = $1`, [order.id]);
  expect(row).toEqual({ paymentStatus: "SUCCEEDED", refundStatus: "DECLINED" });
  await owner.context().close();
});

test("лента заказов сигналит о новой брони и новом сообщении", async ({ browser, request, baseURL }) => {
  const owner = await ownerPage(browser);
  await expect(owner.getByText(/Заказов: \d+/)).toBeVisible();

  const headers = { Origin: baseURL! };
  const message = await request.post("/api/contact", {
    headers,
    data: { name: "Сигнал", contact: "guest@example.com", message: "Проверка сигнала в ленте", consent: true },
  });
  expect(message.status()).toBe(201);
  await expect(owner.getByRole("link", { name: /Сообщения: \d+\s*Новое/ })).toBeVisible({ timeout: 15_000 });

  // Бронь — на первое свободное время послезавтра.
  const booking = await owner.context().newPage();
  await booking.goto("/booking");
  await booking.getByRole("group", { name: "День" }).getByRole("button").nth(2).click();
  const slot = booking.getByRole("group", { name: "Время", exact: true }).getByRole("button", { disabled: false }).first();
  await expect(async () => {
    await slot.click();
    await expect(slot).toHaveAttribute("aria-pressed", "true", { timeout: 500 });
  }).toPass();
  await booking.getByLabel("Имя").fill("Сигнал");
  await booking.getByRole("textbox", { name: "Телефон" }).fill("9997654321");
  await booking.getByRole("checkbox", { name: /Согласен/ }).check();
  await booking.getByRole("button", { name: /Забронировать/ }).click();
  await expect(booking.getByRole("heading", { name: "Бронь принята" })).toBeVisible();
  await expect(owner.getByRole("link", { name: /Новые брони: \d+\s*Новое/ })).toBeVisible({ timeout: 15_000 });
  await owner.context().close();
});

test("бронь: когда зал занят, время недоступно и сервер не принимает бронь", async ({ page, request, baseURL }, info) => {
  // Слот через 9–10 дней в 19:00 по Москве (у каждого проекта свой день, чтобы тесты не мешали друг другу).
  const days = info.project.name === "mobile" ? 9 : 10;
  const msk = new Date(Date.now() + 3 * 3_600_000);
  const day = new Date(Date.UTC(msk.getUTCFullYear(), msk.getUTCMonth(), msk.getUTCDate() + days, 16, 0)); // 19:00 MSK
  const iso = day.toISOString();
  const [{ capacity }] = (await sql<{ capacity: number }>(`SELECT "bookingCapacity" AS capacity FROM "Settings" WHERE id = 1`)) as [
    { capacity: number },
  ];
  const [blocker] = await sql<{ id: string }>(
    `INSERT INTO "Reservation" ("id", "startsAt", "guests", "name", "phone", "status", "consentAt", "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, 'Банкет (тест)', '+79990000000', 'CONFIRMED', now(), now(), now()) RETURNING "id"`,
    [iso, capacity],
  );
  try {
    const res = await request.post("/api/reservations", {
      headers: { Origin: baseURL! },
      data: { startsAt: iso, guests: 2, name: "Тест", phone: "9991112233", consent: true },
    });
    expect(res.status()).toBe(409);
    expect((await res.json()).code).toBe("FULL");

    await page.goto("/booking");
    const dateLabel = new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", day: "numeric", month: "short" }).format(day);
    await page.getByRole("group", { name: "День" }).getByRole("button", { name: new RegExp(dateLabel) }).click();
    await expect(page.getByRole("button", { name: "19:00 — занято" })).toBeDisabled();
  } finally {
    await sql(`DELETE FROM "Reservation" WHERE "id" = $1`, [blocker!.id]);
  }
});
