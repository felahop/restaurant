import "dotenv/config";
import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

/** Подпись тестового платёжного сервиса (как в src/server/payments/mock.ts). */
function sign(body: string) {
  return createHmac("sha256", `mock-payments:${process.env.APP_SECRET}`).update(body).digest("hex");
}

async function orderOnline(page: Page, method: "Картой онлайн" | "СБП" = "Картой онлайн") {
  await page.goto("/");
  await page.getByRole("button", { name: "Добавить в корзину: Тонкоцу рамен" }).click();
  await page.getByRole("button", { name: "Добавить ещё порцию: Тонкоцу рамен" }).click();
  await page
    .getByRole("banner")
    .getByRole("link", { name: /^Корзина:/ })
    .click();
  await page.getByRole("group", { name: "Способ получения" }).getByText("Самовывоз").click();
  await expect(page.getByRole("radio", { name: "Самовывоз" })).toBeChecked();
  await page.getByLabel("Имя").fill("Анна");
  await page.getByRole("textbox", { name: "Телефон" }).fill("9991234567");
  await page.getByRole("radio", { name: method }).check();
  await page.getByRole("checkbox", { name: /Согласен на обработку/ }).check();
  await page.getByRole("button", { name: /Перейти к оплате · 1\s380\s₽/ }).click();
  await expect(page).toHaveURL(/\/pay\/mock\/mock_[0-9a-f]+$/);
  await expect(page.getByRole("heading", { name: /Оплата заказа №\d+/ })).toBeVisible();
}

test.describe("оплата", () => {
  test("гость без регистрации: от главной до оплаченного заказа", async ({ page }) => {
    await orderOnline(page);
    await page.getByRole("button", { name: "Оплатить" }).click();
    await expect(page).toHaveURL(/\/order\/[A-Za-z0-9_-]{20,}$/);
    await expect(page.getByRole("heading", { level: 1, name: "Принят" })).toBeVisible();
    await expect(page.getByText("Оплачен онлайн")).toBeVisible();
    await expect(page.getByRole("list", { name: "Этапы заказа" })).toContainText("Готов к выдаче");
  });

  test("оплата не прошла → попробовать ещё раз → оплачено", async ({ page }) => {
    await orderOnline(page, "СБП");
    await page.getByRole("button", { name: "Отказаться от оплаты" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Оплата не прошла" })).toBeVisible();
    await expect(page.getByText("Деньги не списаны")).toBeVisible();

    await page.getByRole("button", { name: "Попробовать ещё раз" }).click();
    await expect(page).toHaveURL(/\/pay\/mock\//);
    await page.getByRole("button", { name: "Оплатить" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Принят" })).toBeVisible();
  });

  test("повторное уведомление не дублирует заказ, поддельное отклоняется", async ({ page, request }) => {
    await orderOnline(page);
    const paymentId = page.url().split("/").pop()!;
    await page.getByRole("button", { name: "Оплатить" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Принят" })).toBeVisible();

    const body = JSON.stringify({
      type: "notification",
      event: "payment.succeeded",
      object: { id: paymentId, status: "succeeded" },
    });
    const repeat = await request.post("/api/payments/webhook/mock", {
      headers: { "Content-Type": "application/json", "x-mock-signature": sign(body) },
      data: body,
    });
    expect(repeat.status()).toBe(200);
    expect(await repeat.json()).toMatchObject({ result: "duplicate" });

    const forged = await request.post("/api/payments/webhook/mock", {
      headers: { "Content-Type": "application/json", "x-mock-signature": "0".repeat(64) },
      data: body,
    });
    expect(forged.status()).toBe(403);

    const token = page.url().split("/").pop()!;
    const status = await request.get(`/api/orders/${token}/status`);
    expect(await status.json()).toMatchObject({ status: "ACCEPTED", paymentStatus: "SUCCEEDED" });
  });
});
