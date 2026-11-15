import { expect, test, type Page } from "@playwright/test";

async function addRamen(page: Page, times = 2) {
  await page.goto("/");
  await page.getByRole("button", { name: "Добавить в корзину: Тонкоцу рамен" }).click();
  for (let i = 1; i < times; i++) {
    await page.getByRole("button", { name: "Добавить ещё порцию: Тонкоцу рамен" }).click();
  }
}

async function chooseAddress(page: Page, query: string, option: RegExp) {
  const input = page.getByRole("combobox", { name: "Адрес доставки" });
  await input.fill(query);
  await page.getByRole("option", { name: option }).click();
}

async function fillContacts(page: Page) {
  await page.getByLabel("Имя").fill("Анна");
  await page.getByRole("textbox", { name: "Телефон" }).fill("9991234567");
}

test.describe("корзина и оформление", () => {
  test("гость без регистрации: главная → корзина → заказ (наличными)", async ({ page }) => {
    await addRamen(page, 2);
    await page
      .getByRole("banner")
      .getByRole("link", { name: /^Корзина:/ })
      .click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByRole("heading", { name: /Корзина · 2 блюда/ })).toBeVisible();

    await chooseAddress(page, "Покровка", /Покровка, 12/);
    await expect(page.getByText(/Зона «Центр»: доставка 150/)).toBeVisible();
    await expect(page.getByText(/До бесплатной доставки осталось 1\s120\s₽/)).toBeVisible();

    await fillContacts(page);
    await page.getByRole("radio", { name: "Наличными" }).check();
    await page.getByRole("checkbox", { name: /Согласен на обработку персональных данных/ }).check();
    await page.getByRole("button", { name: /Оформить заказ · 1\s530\s₽/ }).click();

    await expect(page).toHaveURL(/\/order\/[A-Za-z0-9_-]{20,}$/);
    await expect(page.getByRole("heading", { level: 1, name: "Принят" })).toBeVisible();
    await expect(page.getByText("Тонкоцу рамен × 2")).toBeVisible();
    await expect(page.getByText(/Итого · Наличными/)).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "Корзина пуста" })).toBeVisible();
  });

  test("адрес вне зоны не даёт оформить доставку и предлагает самовывоз", async ({ page }) => {
    await addRamen(page, 2);
    await page.goto("/checkout");
    await chooseAddress(page, "Профсоюзная", /Профсоюзная улица, 120/);
    await expect(page.getByText("Сюда пока не доставляем").first()).toBeVisible();

    await fillContacts(page);
    await page.getByRole("radio", { name: "Наличными" }).check();
    await page.getByRole("checkbox", { name: /Согласен на обработку/ }).check();
    await page.getByRole("button", { name: /Оформить заказ/ }).click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByText(/Сюда пока не доставляем — выберите самовывоз/)).toBeVisible();

    await page.getByRole("button", { name: "Заберу сам" }).click();
    await expect(page.getByRole("radio", { name: "Самовывоз" })).toBeChecked();
    await page.getByRole("button", { name: /Оформить заказ · 1\s380\s₽/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Принят" })).toBeVisible();
    await expect(page.getByText(/Самовывоз:/)).toBeVisible();
  });

  test("минимальная сумма зоны и промокод", async ({ page }) => {
    await addRamen(page, 1);
    await page.goto("/checkout");
    await chooseAddress(page, "Бауманская", /Бауманская улица, 35/);
    await expect(page.getByText(/Минимальный заказ в эту зону — 1200 ₽\. Добавьте ещё на 510 ₽/)).toBeVisible();

    await page.getByRole("button", { name: "Добавить ещё порцию: Тонкоцу рамен" }).click();
    await expect(page.getByText(/Минимальный заказ в эту зону/)).toHaveCount(0);

    await page.getByLabel("Промокод").fill("огонь10");
    await page.getByRole("button", { name: "Применить" }).click();
    await expect(page.getByText("Промокод применён")).toBeVisible();
    // 1 380 − 138 (10 %) + 250 доставка = 1 492
    await expect(page.getByRole("button", { name: /Перейти к оплате · 1\s492\s₽/ })).toBeVisible();
  });

  test("подмена цены в запросе не меняет сумму заказа", async ({ page, baseURL }) => {
    await addRamen(page, 1);
    const dishId = await page.evaluate(
      () => JSON.parse(localStorage.getItem("sumibi.cart.v1") ?? "{}").lines[0].dishId as string,
    );
    const res = await page.request.post("/api/orders", {
      headers: { Origin: baseURL! },
      data: {
        items: [{ dishId, modifierIds: [], qty: 1, price: 100, unitPrice: 100, lineTotal: 100 }],
        type: "PICKUP",
        total: 100,
        subtotal: 100,
        when: { kind: "asap" },
        customer: { name: "Тест", phone: "+7 999 123-45-67", cutlery: 0 },
        payment: "CASH",
        consent: true,
      },
    });
    // Если кухня сейчас закрыта, сервер честно откажет — тогда проверяем расчёт через quote.
    if (res.status() === 409) {
      const quote = await page.request.post("/api/checkout/quote", {
        headers: { Origin: baseURL! },
        data: { items: [{ dishId, modifierIds: [], qty: 1, price: 100 }], type: "PICKUP" },
      });
      expect((await quote.json()).quote.total).toBe(69_000);
      return;
    }
    expect(res.status()).toBe(201);
    const { token } = (await res.json()) as { token: string };
    await page.goto(`/order/${token}`);
    await expect(page.getByText(/Итого · Наличными/).locator("..")).toContainText(/690\s₽/);
  });

  test("запрос с чужого сайта отклоняется", async ({ page }) => {
    const res = await page.request.post("/api/checkout/quote", {
      headers: { Origin: "https://evil.example" },
      data: { items: [], type: "PICKUP" },
    });
    expect(res.status()).toBe(403);
  });

  test("пустая корзина", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.getByText("В корзине пока пусто")).toBeVisible();
    await expect(page.getByRole("link", { name: "Выбрать блюда" })).toHaveAttribute("href", "/menu");
  });
});
