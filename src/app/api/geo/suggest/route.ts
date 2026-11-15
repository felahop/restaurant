import { connection } from "next/server";
import { getGeoProvider } from "@/server/geo";
import { clientIp, jsonError } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { geoContext } from "@/server/geo/context";

/** Подсказки адреса: GET /api/geo/suggest?q=мясницкая */
export async function GET(request: Request) {
  await connection();
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return Response.json({ suggestions: [] });
  if (q.length > 200) return jsonError(400, "Слишком длинный запрос");

  const limit = await rateLimit(`suggest:${clientIp(request)}`, 60, 60);
  if (!limit.ok) return jsonError(429, "Слишком много запросов. Подождите минуту.", { retryAfter: limit.retryAfter });

  try {
    const suggestions = await getGeoProvider().suggest(q, await geoContext());
    return Response.json({ suggestions });
  } catch (e) {
    console.error("[geo] suggest", e);
    return jsonError(502, "Подсказки адресов временно недоступны. Введите адрес полностью.");
  }
}
