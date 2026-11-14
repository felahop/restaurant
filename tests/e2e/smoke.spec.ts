import { expect, test } from "@playwright/test";

test.describe("каркас и дизайн-система", () => {
  test("главная: плашка, шапка, подвал, телефон ссылкой", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).not.toBeEmpty();
    await expect(page.getByRole("complementary", { name: "Условия доставки" })).toBeVisible();
    const tel = page.locator('a[href^="tel:"]').first();
    await expect(tel).toHaveAttribute("href", /^tel:\+7\d{10}$/);
    await expect(page.getByRole("contentinfo")).toContainText("Политика конфиденциальности");
  });

  test("нет горизонтальной прокрутки", async ({ page }) => {
    for (const path of ["/", "/styleguide"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test("витрина: добавление блюда увеличивает счётчик корзины", async ({ page }) => {
    await page.goto("/styleguide#dish");
    const section = page.locator("#dish");
    const cart = section.getByRole("link", { name: /^Корзина/ });
    await expect(cart).toHaveAttribute("aria-label", /2 блюда/);
    await section.getByRole("button", { name: "Добавить в корзину: Тонкоцу рамен" }).click();
    await expect(cart).toHaveAttribute("aria-label", /3 блюда/);
    await section.getByRole("button", { name: "Добавить ещё порцию: Тонкоцу рамен", exact: true }).click();
    await expect(cart).toHaveAttribute("aria-label", /4 блюда/);
  });

  test("закончившееся блюдо нельзя добавить", async ({ page }) => {
    await page.goto("/styleguide#dish");
    await expect(page.getByRole("button", { name: "Ролл с угрём закончилось" })).toBeDisabled();
  });

  test("мобильное меню открывается и закрывается по Escape", async ({ page, isMobile }) => {
    test.skip(!isMobile, "только на телефоне");
    await page.goto("/");
    await page.getByRole("banner").getByRole("button", { name: "Открыть меню" }).click();
    const dialog = page.getByRole("dialog", { name: "Меню сайта" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Доставка" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});
