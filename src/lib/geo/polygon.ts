/** Геометрия зон доставки. Точки — [широта, долгота]. */

export type LatLng = { lat: number; lng: number };
export type PolygonRing = [number, number][];

/** Точка внутри многоугольника (метод луча). Подходит для зон размером с город. */
export function pointInPolygon(point: LatLng, ring: PolygonRing): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [latI, lngI] = ring[i]!;
    const [latJ, lngJ] = ring[j]!;
    const crosses =
      lngI > point.lng !== lngJ > point.lng && point.lat < ((latJ - latI) * (point.lng - lngI)) / (lngJ - lngI) + latI;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** Расстояние по большому кругу, км. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Проверяет и приводит данные многоугольника из базы (JSON) к кольцу координат. */
export function parsePolygon(value: unknown): PolygonRing | null {
  if (!Array.isArray(value) || value.length < 3) return null;
  const ring: PolygonRing = [];
  for (const p of value) {
    if (!Array.isArray(p) || p.length !== 2) return null;
    const [lat, lng] = p as unknown[];
    if (typeof lat !== "number" || typeof lng !== "number" || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    ring.push([lat, lng]);
  }
  return ring;
}

/** Правильный многоугольник вокруг центра — для демо-зон. */
export function circlePolygon(center: LatLng, radiusKm: number, sides = 16, wobble: number[] = []): PolygonRing {
  const ring: PolygonRing = [];
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides;
    const r = radiusKm * (1 + (wobble[i % Math.max(wobble.length, 1)] ?? 0));
    const dLat = (r / 111.32) * Math.sin(angle);
    const dLng = (r / (111.32 * Math.cos((center.lat * Math.PI) / 180))) * Math.cos(angle);
    ring.push([Number((center.lat + dLat).toFixed(6)), Number((center.lng + dLng).toFixed(6))]);
  }
  return ring;
}
