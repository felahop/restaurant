import { connection } from "next/server";
import { restaurant } from "@/config/restaurant";
import { restaurantSchema, toJsonLd } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/site-url";
import { getSiteInfo } from "@/server/site-info";
import { getSettings } from "@/server/settings";

/** Встраивает разметку schema.org в страницу (рекомендация Next.js: <script> в page/layout). */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(data) }} />;
}

/** Restaurant: адрес, координаты, часы, телефон — из настроек админ-панели. */
export async function RestaurantJsonLd() {
  await connection(); // данные из базы — во время запроса, а не при сборке
  const [info, settings] = await Promise.all([getSiteInfo(), getSettings()]);
  return (
    <JsonLd
      data={restaurantSchema({
        url: SITE_URL,
        name: info.name,
        description: info.description,
        image: `${SITE_URL}/opengraph-image`,
        phone: info.phoneE164,
        email: info.email,
        street: info.addressShort,
        city: settings.city,
        country: restaurant.country,
        lat: info.lat,
        lng: info.lng,
        hours: settings.openingHours,
        cuisines: restaurant.cuisines,
        sameAs: info.messengers.map((m) => m.href),
      })}
    />
  );
}
