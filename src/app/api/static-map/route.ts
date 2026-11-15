import { connection } from "next/server";
import { yandexStaticMapUrl } from "@/lib/maps/links";
import { getSettings } from "@/server/settings";

/**
 * Прокси статичной карты: ключ Яндекса не попадает в браузер, картинка кэшируется на сутки.
 * Без ключа (YANDEX_MAPS_STATIC_API_KEY) отвечает 404 — на странице остаётся схема.
 */
export async function GET() {
  await connection(); // ключ читается при запросе, а не при сборке
  const apiKey = process.env.YANDEX_MAPS_STATIC_API_KEY;
  if (!apiKey) return new Response("Static map is not configured", { status: 404 });

  const { lat, lng } = await getSettings(); // точка ресторана из настроек админ-панели
  const upstream = await fetch(yandexStaticMapUrl({ apiKey, lat, lng }), { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return new Response("Static map is unavailable", { status: 502 });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
