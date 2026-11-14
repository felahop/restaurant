/** Ссылки на Яндекс Карты (без ключа API): открыть точку и построить маршрут. */

export function yandexMapsPointUrl(lat: number, lng: number, zoom = 17): string {
  return `https://yandex.ru/maps/?ll=${lng},${lat}&z=${zoom}&pt=${lng},${lat},pm2rdl`;
}

/** Маршрут от текущего местоположения гостя до точки. */
export function yandexMapsRouteUrl(lat: number, lng: number): string {
  return `https://yandex.ru/maps/?rtext=~${lat},${lng}&rtt=auto`;
}

/**
 * URL статичной карты Яндекса (Static API v1). Ключ используется только на сервере,
 * браузер получает картинку через /api/static-map.
 * Документация: https://yandex.ru/maps-api/docs/static-api/request.html (максимум 650×450).
 */
export function yandexStaticMapUrl(opts: {
  apiKey: string;
  lat: number;
  lng: number;
  zoom?: number;
  theme?: "light" | "dark";
}): string {
  const { apiKey, lat, lng, zoom = 16, theme = "dark" } = opts;
  const params = new URLSearchParams({
    lang: "ru_RU",
    ll: `${lng},${lat}`,
    z: String(zoom),
    size: "650,450",
    scale: "2",
    theme,
    pt: `${lng},${lat},pm2rdl`,
    apikey: apiKey,
  });
  return `https://static-maps.yandex.ru/v1?${params.toString()}`;
}
