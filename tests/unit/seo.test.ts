import { describe, expect, it } from "vitest";
import { menuItemSchema, menuSchema, openingHoursSpecification, restaurantSchema, toJsonLd } from "@/lib/seo/schema";

describe("schema.org", () => {
  it("часы работы: по дням, полночь — 23:59, выходной пропускается", () => {
    const spec = openingHoursSpecification({
      mon: [{ open: "11:00", close: "23:00" }],
      fri: [{ open: "11:00", close: "00:00" }],
      sun: [],
    });
    expect(spec).toEqual([
      { "@type": "OpeningHoursSpecification", dayOfWeek: "https://schema.org/Monday", opens: "11:00", closes: "23:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "https://schema.org/Friday", opens: "11:00", closes: "23:59" },
    ]);
  });

  it("Restaurant: адрес, координаты, бронь и меню", () => {
    const r = restaurantSchema({
      url: "https://sumibi.example",
      name: "Сумиби",
      description: "Рамен и вок",
      image: "https://sumibi.example/opengraph-image",
      phone: "+74950000000",
      email: "hello@example.com",
      street: "Чистопрудный бульвар, 99",
      city: "Москва",
      country: "RU",
      lat: 55.76,
      lng: 37.64,
      hours: {},
      cuisines: ["Рамен"],
      sameAs: [],
    });
    expect(r["@type"]).toBe("Restaurant");
    expect(r.geo).toEqual({ "@type": "GeoCoordinates", latitude: 55.76, longitude: 37.64 });
    expect(r.acceptsReservations).toBe("https://sumibi.example/booking");
    expect(r).not.toHaveProperty("sameAs");
  });

  it("MenuItem: цена в рублях, диета, наличие", () => {
    const item = menuItemSchema(
      {
        name: "Вок с тофу",
        description: "Овощи",
        price: 52_000,
        slug: "wok-tofu",
        isVegan: true,
        soldOut: true,
        imageUrl: "/uploads/x.webp",
      },
      "https://s.example",
    );
    expect(item.offers).toEqual({
      "@type": "Offer",
      price: "520.00",
      priceCurrency: "RUB",
      availability: "https://schema.org/OutOfStock",
    });
    expect(item.suitableForDiet).toBe("https://schema.org/VeganDiet");
    expect(item.image).toBe("https://s.example/uploads/x.webp");
    const menu = menuSchema(
      [{ name: "Вок", dishes: [{ name: "А", description: "", price: 100, slug: "a" }] }],
      "https://s.example",
      "Сумиби",
    );
    expect(menu.hasMenuSection[0]!.hasMenuItem).toHaveLength(1);
  });

  it("JSON-LD не даёт закрыть тег script из текста", () => {
    expect(toJsonLd({ name: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});
