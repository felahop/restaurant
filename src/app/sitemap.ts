import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { absoluteUrl } from "@/lib/site-url";
import { getMenu } from "@/server/menu";

/** Карта сайта: страницы витрины и все блюда из меню (читается при запросе — сборке база не нужна). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const categories = await getMenu();
  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/menu"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/delivery"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/booking"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/contacts"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/offer"), changeFrequency: "yearly", priority: 0.2 },
  ];
  const dishes = categories.flatMap((c) =>
    c.dishes.map((d) => ({
      url: absoluteUrl(`/menu/${d.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
      ...(d.imageUrl ? { images: [d.imageUrl.startsWith("http") ? d.imageUrl : absoluteUrl(d.imageUrl)] } : {}),
    })),
  );
  return [...pages, ...dishes];
}
