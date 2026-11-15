import "server-only";
import { connection } from "next/server";

/**
 * Ключ JavaScript API Яндекс Карт (v3). Читается во время запроса, поэтому подключается без пересборки.
 * Ключ попадает в браузер — это нормально для JS API; в кабинете разработчика ограничьте его по HTTP Referer
 * (адрес сайта). Без ключа сайт и админка показывают фирменную схему зон.
 */
export async function yandexMapsConfig(): Promise<{ apiKey: string; scriptUrl: string } | null> {
  await connection();
  const apiKey = process.env.YANDEX_MAPS_JS_API_KEY;
  if (!apiKey) return null;
  // TODO: сверить адрес загрузки с документацией (yandex.ru/dev/jsapi30/doc/ru/dg/concepts/load) при подключении ключа —
  // из среды разработки сайт документации был недоступен. Адрес можно переопределить без правки кода.
  const scriptUrl = process.env.YANDEX_MAPS_JS_URL || "https://api-maps.yandex.ru/v3/";
  return { apiKey, scriptUrl };
}
