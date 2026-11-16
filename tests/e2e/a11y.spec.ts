import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Автоматическая проверка доступности (axe-core, правила WCAG 2.0/2.1 A и AA) на ключевых страницах.
 * Ручную проверку (клавиатура, скринридер) автотест не заменяет.
 */
async function audit(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const problems = result.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes
        .map((n) => n.target.join(" "))
        .slice(0, 3)
        .join(" | ")}`,
  );
  expect(problems, problems.join("\n")).toEqual([]);
}

const PAGES = [
  "/",
  "/menu",
  "/menu/tonkotsu-ramen",
  "/delivery",
  "/booking",
  "/contacts",
  "/account",
  "/privacy",
  "/nope-404",
];

for (const path of PAGES) {
  test(`доступность: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await audit(page);
  });
}

test("доступность: корзина и оформление", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Добавить в корзину: Тонкоцу рамен" }).click();
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Итого" })).toBeVisible();
  await audit(page);
});

test("доступность: вход в админ-панель", async ({ page }) => {
  await page.goto("/admin/login");
  await audit(page);
});
