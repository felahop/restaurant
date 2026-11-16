import type { Metadata } from "next";
import { restaurant } from "@/config/restaurant";

/**
 * Фирменная картинка для ссылок (app/opengraph-image.tsx). Указываем явно: если страница задаёт свой openGraph,
 * Next.js не наследует картинку от корня.
 */
export const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${restaurant.name} — ${restaurant.tagline}`,
};

/** Метаданные страницы витрины: заголовок, описание, canonical, Open Graph и карточка для X/Telegram. */
export function pageMetadata({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
}): Metadata {
  const images = image ? [image] : [OG_IMAGE];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "ru_RU",
      siteName: restaurant.name,
      title: `${title} — ${restaurant.name}`,
      description,
      url: path,
      images,
    },
    twitter: { card: "summary_large_image", title: `${title} — ${restaurant.name}`, description, images },
  };
}
