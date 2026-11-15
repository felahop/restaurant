import "dotenv/config";
import pg from "pg";
import { expect, test } from "@playwright/test";

/** Меняем статус заказа напрямую в базе — так же, как это сделает админ-панель (этап 6). */
async function setStatus(token: string, status: string, column: string) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`UPDATE "Order" SET "status" = $1, "${column}" = now() WHERE "publicToken" = $2`, [
      status,
      token,
    ]);
  } finally {
    await client.end();
  }
}

test("страница заказа обновляется сама при смене статуса", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Добавить в корзину: Тонкоцу рамен" }).click();
  await page.getByRole("button", { name: "Добавить ещё порцию: Тонкоцу рамен" }).click();
  await page.goto("/checkout");
  await page.getByRole("group", { name: "Способ получения" }).getByText("Самовывоз").click();
  await page.getByLabel("Имя").fill("Анна");
  await page.getByRole("textbox", { name: "Телефон" }).fill("9991234567");
  await page.getByRole("radio", { name: "Наличными" }).check();
  await page.getByRole("checkbox", { name: /Согласен на обработку/ }).check();
  await page.getByRole("button", { name: /Оформить заказ/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Принят" })).toBeVisible();
  const token = page.url().split("/").pop()!;

  await setStatus(token, "COOKING", "cookingAt");
  await expect(page.getByRole("heading", { level: 1, name: "Готовится" })).toBeVisible({ timeout: 12_000 });

  await setStatus(token, "READY", "readyAt");
  await expect(page.getByRole("heading", { level: 1, name: "Готов к выдаче" })).toBeVisible({ timeout: 12_000 });
  await expect(page.getByRole("listitem").filter({ hasText: "Готов к выдаче" })).toHaveAttribute(
    "aria-current",
    "step",
  );
});
