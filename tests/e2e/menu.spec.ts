import { expect, test } from "@playwright/test";

test.describe("меню", () => {
  test("категории из базы и липкая навигация", async ({ page }) => {
    await page.goto("/menu");
    const nav = page.getByRole("navigation", { name: "Категории меню" });
    await expect(nav.getByRole("link")).toHaveText([
      "Рамен",
      "Вок",
      "Бао и димсамы",
      "Роллы",
      "Супы и закуски",
      "Напитки и десерты",
    ]);
    await expect(nav.getByRole("link", { name: "Рамен" })).toHaveAttribute("aria-current", "true");

    await nav.getByRole("link", { name: "Роллы" }).click();
    await expect(page.getByRole("heading", { name: /^Роллы/ })).toBeInViewport();
    await expect(nav.getByRole("link", { name: "Роллы" })).toHaveAttribute("aria-current", "true");
    // Навигация остаётся на экране при прокрутке.
    await expect(nav).toBeInViewport();
  });

  test("поиск и фильтры", async ({ page }) => {
    await page.goto("/menu");
    const cards = page.locator("main article");
    await expect(cards).toHaveCount(30);

    await page.getByLabel("Поиск по меню").fill("тофу");
    await expect(page.getByRole("heading", { name: "Вок с овощами и тофу" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Тонкоцу рамен" })).toHaveCount(0);

    await page.getByLabel("Поиск по меню").fill("");
    const filters = page.getByRole("group", { name: "Фильтры" });
    await filters.getByRole("button", { name: "Веган" }).click();
    await filters.getByRole("button", { name: "Без глютена" }).click();
    await expect(filters.getByRole("button", { name: "Веган" })).toHaveAttribute("aria-pressed", "true");
    await expect(cards).toHaveCount(5);

    await page.getByLabel("Поиск по меню").fill("абракадабра");
    await expect(page.getByText("Ничего не нашли")).toBeVisible();
    await page.getByRole("button", { name: "Сбросить поиск и фильтры" }).click();
    await expect(cards).toHaveCount(30);
  });

  test("стоп-лист: блюдо видно с меткой, но не добавляется", async ({ page }) => {
    await page.goto("/menu");
    const card = page.locator("article", { has: page.getByRole("heading", { name: "Ролл с угрём" }) });
    await expect(card.getByText("Закончилось")).toBeVisible();
    await expect(card.getByRole("button", { name: "Ролл с угрём закончилось" })).toBeDisabled();

    await page.goto("/menu/unagi-roll");
    await expect(page.getByRole("heading", { level: 1, name: "Ролл с угрём" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Добавить ·/ })).toHaveCount(0);
    await expect(page.getByText("Закончилось на сегодня.")).toBeVisible();
  });

  test("шторка блюда: обязательная основа, добавки, пересчёт цены, корзина", async ({ page }) => {
    await page.goto("/menu");
    const card = page.locator("article", {
      has: page.getByRole("heading", { name: "Вок с говядиной и чёрным перцем" }),
    });
    // Блюдо с обязательным выбором нельзя добавить «вслепую».
    await expect(card.getByRole("link", { name: "Выбрать добавки: Вок с говядиной и чёрным перцем" })).toBeVisible();

    await card.getByRole("link", { name: "Вок с говядиной и чёрным перцем", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Вок с говядиной и чёрным перцем" });
    await expect(sheet).toBeVisible();
    await expect(page).toHaveURL(/\/menu\/wok-beef-black-pepper$/);

    await expect(sheet.getByRole("radio", { name: /Удон/ })).toBeChecked();
    await expect(sheet.getByRole("button", { name: "Добавить · 640 ₽" })).toBeVisible();

    await sheet.getByRole("radio", { name: /Гречневая соба/ }).check();
    await sheet.getByRole("checkbox", { name: /Креветки/ }).check();
    await sheet.getByRole("button", { name: "Добавить ещё порцию: Вок с говядиной и чёрным перцем" }).click();
    await expect(sheet.getByRole("button", { name: /Добавить · 1\s860\s₽/ })).toBeVisible();

    await sheet.getByRole("button", { name: /Добавить · / }).click();
    await expect(sheet.getByRole("button", { name: "В корзине" })).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: /Корзина: 2 блюда на 1\s860\s₽/ })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(page).toHaveURL(/\/menu$/);
  });

  test("страница блюда по прямой ссылке: состав, КБЖУ, аллергены, «С этим берут»", async ({ page }) => {
    await page.goto("/menu/tonkotsu-ramen");
    await expect(page.getByRole("heading", { level: 1, name: "Тонкоцу рамен" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Хлебные крошки" })).toContainText("Рамен");
    await expect(page.getByRole("heading", { name: "Состав" })).toBeVisible();
    await expect(page.getByText("Пищевая ценность на порцию")).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: /^Глютен$/ })).toBeVisible();
    const pairings = page.locator("section", { has: page.getByRole("heading", { name: "С этим берут" }) });
    await expect(pairings.getByRole("article")).toHaveCount(4);
    await expect(page).toHaveTitle(/Тонкоцу рамен/);
  });

  test("неизвестное блюдо — страница 404", async ({ page }) => {
    await page.goto("/menu/no-such-dish");
    await expect(page.getByRole("heading", { name: "Такой страницы нет" })).toBeVisible();
  });
});
