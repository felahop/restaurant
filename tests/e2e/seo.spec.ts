import { expect, test } from "@playwright/test";

/** SEO: robots.txt, sitemap.xml, Open Graph, canonical и разметка schema.org. */
test.describe("SEO", () => {
  test.skip(({ isMobile }) => isMobile, "серверные ответы одинаковы для телефона и компьютера");

  test("robots.txt закрывает служебные страницы и указывает карту сайта", async ({ request }) => {
    const body = await (await request.get("/robots.txt")).text();
    for (const path of ["/admin", "/api/", "/checkout", "/account", "/order/"])
      expect(body).toContain(`Disallow: ${path}`);
    expect(body).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
  });

  test("sitemap.xml содержит страницы витрины и блюда из базы", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.headers()["content-type"]).toContain("xml");
    const xml = await res.text();
    for (const path of ["/menu</loc>", "/booking</loc>", "/contacts</loc>", "/menu/tonkotsu-ramen</loc>"])
      expect(xml).toContain(path);
    expect(xml).not.toContain("/admin");
  });

  test("главная: Open Graph с картинкой и разметка Restaurant", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /\/opengraph-image/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https?:\/\/[^/]+\/?$/);
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    const restaurant = ld.map((t) => JSON.parse(t)).find((d) => d["@type"] === "Restaurant");
    expect(restaurant).toMatchObject({
      acceptsReservations: expect.stringContaining("/booking"),
      geo: { "@type": "GeoCoordinates" },
    });
    const og = await request.get("/opengraph-image");
    expect(og.headers()["content-type"]).toBe("image/png");
  });

  test("меню и блюдо: разметка Menu и MenuItem с ценой в рублях", async ({ page }) => {
    await page.goto("/menu");
    const menu = (await page.locator('script[type="application/ld+json"]').allTextContents())
      .map((t) => JSON.parse(t))
      .find((d) => d["@type"] === "Menu");
    expect(menu.hasMenuSection.length).toBeGreaterThan(0);

    await page.goto("/menu/tonkotsu-ramen");
    await expect(page).toHaveTitle(/Тонкоцу рамен/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/menu\/tonkotsu-ramen$/);
    const item = (await page.locator('script[type="application/ld+json"]').allTextContents())
      .map((t) => JSON.parse(t))
      .find((d) => d["@type"] === "MenuItem");
    expect(item.offers).toMatchObject({ priceCurrency: "RUB", price: "690.00" });
  });

  test("админка и личные страницы не индексируются", async ({ page }) => {
    for (const path of ["/admin/login", "/checkout", "/account"]) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    }
  });
});
