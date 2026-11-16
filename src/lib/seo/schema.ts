/**
 * Разметка schema.org (JSON-LD): Restaurant, Menu, MenuItem. Чистые функции — проверяются тестами.
 * Деньги в разметке — рубли строкой («690.00»), часы — по дням недели.
 */
import type { WeekHours } from "@/lib/order/schedule";

const DAY_NAMES = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
} as const;

const money = (kopecks: number) => (kopecks / 100).toFixed(2);

export function openingHoursSpecification(hours: WeekHours) {
  return (Object.keys(DAY_NAMES) as (keyof typeof DAY_NAMES)[]).flatMap((d) =>
    (hours[d] ?? []).map((i) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${DAY_NAMES[d]}`,
      opens: i.open,
      // Закрытие в полночь по schema.org записывается как 23:59.
      closes: i.close === "00:00" ? "23:59" : i.close,
    })),
  );
}

export type RestaurantSchemaInput = {
  url: string;
  name: string;
  description: string;
  image: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  hours: WeekHours;
  cuisines: readonly string[];
  sameAs: string[];
};

export function restaurantSchema(r: RestaurantSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${r.url}/#restaurant`,
    name: r.name,
    description: r.description,
    url: r.url,
    image: r.image,
    telephone: r.phone,
    email: r.email,
    address: { "@type": "PostalAddress", streetAddress: r.street, addressLocality: r.city, addressCountry: r.country },
    geo: { "@type": "GeoCoordinates", latitude: r.lat, longitude: r.lng },
    openingHoursSpecification: openingHoursSpecification(r.hours),
    servesCuisine: r.cuisines,
    acceptsReservations: `${r.url}/booking`,
    hasMenu: `${r.url}/menu`,
    ...(r.sameAs.length ? { sameAs: r.sameAs } : {}),
  };
}

export type SchemaDish = {
  name: string;
  description: string;
  price: number;
  slug: string;
  imageUrl?: string | null;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  soldOut?: boolean;
};

export function menuItemSchema(d: SchemaDish, siteUrl: string) {
  const diets = [
    d.isVegan ? "https://schema.org/VeganDiet" : null,
    d.isGlutenFree ? "https://schema.org/GlutenFreeDiet" : null,
  ].filter(Boolean);
  return {
    "@type": "MenuItem",
    name: d.name,
    description: d.description,
    url: `${siteUrl}/menu/${d.slug}`,
    ...(d.imageUrl ? { image: d.imageUrl.startsWith("http") ? d.imageUrl : `${siteUrl}${d.imageUrl}` } : {}),
    ...(diets.length ? { suitableForDiet: diets.length === 1 ? diets[0] : diets } : {}),
    offers: {
      "@type": "Offer",
      price: money(d.price),
      priceCurrency: "RUB",
      availability: d.soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    },
  };
}

export function menuSchema(
  categories: { name: string; dishes: SchemaDish[] }[],
  siteUrl: string,
  restaurantName: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: `Меню ${restaurantName}`,
    url: `${siteUrl}/menu`,
    inLanguage: "ru",
    hasMenuSection: categories.map((c) => ({
      "@type": "MenuSection",
      name: c.name,
      hasMenuItem: c.dishes.map((d) => menuItemSchema(d, siteUrl)),
    })),
  };
}

/** JSON для <script type="application/ld+json">: «<» экранируется, чтобы текст из базы не закрыл тег. */
export function toJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
