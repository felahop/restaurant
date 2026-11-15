import { z } from "zod";
import { findZone } from "@/lib/order/calc";
import { issueAddressToken } from "@/server/address-token";
import { getGeoProvider } from "@/server/geo";
import { geoContext } from "@/server/geo/context";
import { clientIp, isSameOrigin, jsonError } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { getZones } from "@/server/zones";

const bodySchema = z.object({ value: z.string().trim().min(3).max(300), ref: z.string().max(2000).optional() });

/** Адрес → координаты, зона и подписанный токен для расчёта заказа. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Запрос с другого сайта");
  const limit = await rateLimit(`resolve:${clientIp(request)}`, 30, 60);
  if (!limit.ok) return jsonError(429, "Слишком много запросов. Подождите минуту.", { retryAfter: limit.retryAfter });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Введите адрес");

  let resolved;
  try {
    resolved = await getGeoProvider().resolve(parsed.data, await geoContext());
  } catch (e) {
    console.error("[geo] resolve", e);
    return jsonError(502, "Не получилось проверить адрес. Попробуйте ещё раз через минуту.");
  }
  if (!resolved) return jsonError(404, "Не нашли такой адрес. Проверьте улицу и номер дома.");
  if (resolved.precision !== "house") return jsonError(422, "Уточните номер дома — без него курьер не найдёт вас.");

  const zone = findZone(resolved, await getZones());
  const token = issueAddressToken({ value: resolved.value, lat: resolved.lat, lng: resolved.lng });
  return Response.json({
    address: { value: resolved.value, lat: resolved.lat, lng: resolved.lng },
    token,
    zone: zone
      ? {
          id: zone.id,
          name: zone.name,
          fee: zone.fee,
          minOrder: zone.minOrder,
          freeFrom: zone.freeFrom,
          etaMinutes: zone.etaMinutes,
        }
      : null,
  });
}
