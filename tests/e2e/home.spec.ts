import { expect, test } from "@playwright/test";

test.describe("главная", () => {
  test("секции идут по порядку и кнопки заказа и брони на первом экране", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator("section", { has: page.locator("#hero-title") });
    await expect(hero.getByRole("link", { name: "Заказать доставку" })).toHaveAttribute("href", "/menu");
    await expect(hero.getByRole("link", { name: "Забронировать стол" })).toHaveAttribute("href", "/booking");

    const headings = await page.locator("main h2").allTextContents();
    expect(headings).toEqual([
      "Хиты",
      "Повод заказать сегодня",
      "Начинали с\u00A0одного вока",
      "Зал, кухня и огонь",
      "Что говорят гости",
      "Ждём в зале у огня",
    ]);

    const hits = page.locator("section", { has: page.locator("#hits-title") }).getByRole("article");
    await expect(hits).toHaveCount(4);
    const galleryItems = page.locator("section", { has: page.locator("#gallery-title") }).getByRole("listitem");
    expect(await galleryItems.count()).toBeGreaterThanOrEqual(8);
  });

  test("быстрое добавление хита: счётчик в шапке, полоса корзины на телефоне, корзина сохраняется", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "Корзина пуста" })).toBeVisible();

    await page.getByRole("button", { name: "Добавить в корзину: Тонкоцу рамен" }).click();
    await expect(header.getByRole("link", { name: /Корзина: 1 блюдо/ })).toBeVisible();

    await page.getByRole("button", { name: "Добавить ещё порцию: Тонкоцу рамен" }).click();
    await expect(header.getByRole("link", { name: /Корзина: 2 блюда на 1\s380\s₽/ })).toBeVisible();

    if (isMobile) {
      await expect(page.getByRole("link", { name: /2 блюда\s+1\s380\s₽/ })).toBeVisible();
    }

    await page.reload();
    await expect(header.getByRole("link", { name: /Корзина: 2 блюда/ })).toBeVisible();

    await page.getByRole("button", { name: "Убрать одну порцию: Тонкоцу рамен" }).click();
    await page.getByRole("button", { name: "Убрать одну порцию: Тонкоцу рамен" }).click();
    await expect(header.getByRole("link", { name: "Корзина пуста" })).toBeVisible();
  });

  test("как нас найти: маршрут в Яндекс Картах и звонок", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("section", { has: page.locator("#find-title") });
    await expect(section.getByRole("link", { name: /Построить маршрут/ })).toHaveAttribute(
      "href",
      /^https:\/\/yandex\.ru\/maps\/\?rtext=~/,
    );
    await expect(section.locator('a[href^="tel:"]')).toBeVisible();
    await expect(section.getByRole("img", { name: /Карта:/ })).toBeVisible();
  });
});
