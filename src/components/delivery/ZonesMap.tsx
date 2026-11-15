import { Hanko } from "@/components/brand/Hanko";
import type { PublicZone } from "@/server/zones";

/**
 * Схема зон доставки в SVG: многоугольники из базы, проекция вокруг ресторана.
 * Работает без ключей карт. С ключом YANDEX_MAPS_JS_API_KEY вместо схемы показывается Яндекс Карта (src/components/maps/YandexMap.tsx).
 */
export function ZonesMap({
  zones,
  center,
  label,
}: {
  zones: PublicZone[];
  center: { lat: number; lng: number };
  label: string;
}) {
  const k = Math.cos((center.lat * Math.PI) / 180);
  const project = ([lat, lng]: [number, number]) =>
    [(lng - center.lng) * k * 1000, -(lat - center.lat) * 1000] as const;
  const all = zones.flatMap((z) => z.polygon.map(project));
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const pad = 6;
  const minX = Math.min(...xs, -10) - pad;
  const minY = Math.min(...ys, -10) - pad;
  const width = Math.max(...xs, 10) + pad - minX;
  const height = Math.max(...ys, 10) + pad - minY;
  const ordered = [...zones].sort((a, b) => b.sortOrder - a.sortOrder); // дальние снизу

  return (
    <div className="relative aspect-square overflow-hidden rounded-card border border-line bg-coal md:aspect-4/3">
      <svg
        viewBox={`${minX} ${minY} ${width} ${height}`}
        className="absolute inset-0 size-full"
        role="img"
        aria-label={label}
      >
        <g className="stroke-ash" strokeWidth={0.6} opacity={0.6}>
          {Array.from({ length: 9 }, (_, i) => {
            const x = minX + (width / 8) * i;
            const y = minY + (height / 8) * i;
            return (
              <g key={i}>
                <line x1={x} y1={minY} x2={x} y2={minY + height} />
                <line x1={minX} y1={y} x2={minX + width} y2={y} />
              </g>
            );
          })}
        </g>
        {ordered.map((z) => (
          <polygon
            key={z.id}
            points={z.polygon.map((p) => project(p).join(",")).join(" ")}
            fill={z.color}
            fillOpacity={z.isActive ? 0.16 : 0.05}
            stroke={z.color}
            strokeOpacity={z.isActive ? 0.9 : 0.3}
            strokeWidth={0.8}
            strokeDasharray={z.isActive ? undefined : "2 2"}
          />
        ))}
      </svg>
      <div
        className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
        aria-hidden="true"
      >
        <Hanko className="size-5" />
      </div>
    </div>
  );
}
