import "server-only";
import type { LatLng } from "@/lib/geo/polygon";
import { getSettings } from "@/server/settings";
import { getZones } from "@/server/zones";
import type { GeoContext } from "./types";

/** Окно поиска адресов: вокруг всех активных зон доставки с запасом. */
export async function geoContext(): Promise<GeoContext> {
  const [settings, zones] = await Promise.all([getSettings(), getZones()]);
  const center: LatLng = { lat: settings.lat, lng: settings.lng };
  const points = zones.filter((z) => z.isActive).flatMap((z) => z.polygon);
  if (!points.length) return { center, city: settings.city };
  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  const pad = 0.05;
  return {
    center,
    city: settings.city,
    bbox: [
      { lat: Math.min(...lats) - pad, lng: Math.min(...lngs) - pad },
      { lat: Math.max(...lats) + pad, lng: Math.max(...lngs) + pad },
    ],
  };
}
