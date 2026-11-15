import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { parsePolygon } from "@/lib/geo/polygon";
import type { Zone } from "@/lib/order/calc";
import { db } from "@/server/db";

export const ZONES_TAG = "zones";

export type PublicZone = Zone & { color: string };

/** Активные и выключенные зоны доставки по порядку. Невалидные многоугольники пропускаются. */
export async function getZones(): Promise<PublicZone[]> {
  "use cache";
  cacheTag(ZONES_TAG);
  cacheLife("hours");
  const rows = await db.deliveryZone.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return rows.flatMap((z) => {
    const polygon = parsePolygon(z.polygon);
    if (!polygon) return [];
    return [
      {
        id: z.id,
        name: z.name,
        color: z.color,
        polygon,
        fee: z.fee,
        minOrder: z.minOrder,
        freeFrom: z.freeFrom,
        etaMinutes: z.etaMinutes,
        isActive: z.isActive,
        sortOrder: z.sortOrder,
      },
    ];
  });
}
