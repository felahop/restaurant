import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/** Индексируем витрину; служебные и личные страницы закрыты. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/checkout", "/account", "/order/", "/pay/", "/styleguide"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
