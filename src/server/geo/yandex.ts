import "server-only";
import { distanceKm } from "@/lib/geo/polygon";
import type { AddressPrecision, AddressSuggestion, GeoContext, GeoProvider, ResolvedAddress } from "./types";

/**
 * Яндекс: Геосаджест (подсказки) + API Геокодера (координаты).
 * Документация: https://yandex.ru/maps-api/docs/suggest-api/request.html
 *               https://yandex.ru/maps-api/docs/geocoder-api/request.html
 * Ключи: YANDEX_GEOSUGGEST_API_KEY и YANDEX_GEOCODER_API_KEY (это разные продукты в Кабинете разработчика).
 */

const TIMEOUT_MS = 4000;

type SuggestResponse = {
  results?: {
    title?: { text?: string };
    subtitle?: { text?: string };
    tags?: string[];
    address?: { formatted_address?: string };
    uri?: string;
  }[];
};

type GeocoderResponse = {
  response?: {
    GeoObjectCollection?: {
      featureMember?: {
        GeoObject?: {
          metaDataProperty?: {
            GeocoderMetaData?: { kind?: string; precision?: string; text?: string; Address?: { formatted?: string } };
          };
          Point?: { pos?: string };
        };
      }[];
    };
  };
};

function bboxParam(ctx: GeoContext) {
  if (!ctx.bbox) return undefined;
  const [sw, ne] = ctx.bbox;
  return `${sw.lng},${sw.lat}~${ne.lng},${ne.lat}`;
}

function mapPrecision(kind?: string, precision?: string): AddressPrecision {
  if (kind === "house" && (precision === "exact" || precision === "number" || precision === "near")) return "house";
  if (kind === "street" || precision === "street" || precision === "range") return "street";
  return "other";
}

export class YandexGeoProvider implements GeoProvider {
  readonly name = "yandex";
  constructor(
    private readonly suggestKey: string,
    private readonly geocoderKey: string,
  ) {}

  async suggest(query: string, ctx: GeoContext): Promise<AddressSuggestion[]> {
    const params = new URLSearchParams({
      apikey: this.suggestKey,
      text: `${ctx.city}, ${query}`,
      lang: "ru",
      results: "7",
      types: "street,house",
      print_address: "1",
      attrs: "uri",
    });
    const bbox = bboxParam(ctx);
    if (bbox) {
      params.set("bbox", bbox);
      params.set("strict_bounds", "1");
    } else {
      params.set("ll", `${ctx.center.lng},${ctx.center.lat}`);
    }
    const res = await fetch(`https://suggest-maps.yandex.ru/v1/suggest?${params}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Геосаджест ответил ${res.status}`);
    const data = (await res.json()) as SuggestResponse;
    return (data.results ?? [])
      .map((r) => ({
        value: r.address?.formatted_address ?? [r.title?.text, r.subtitle?.text].filter(Boolean).join(", "),
        title: r.title?.text ?? "",
        subtitle: r.subtitle?.text,
        ref: r.uri,
      }))
      .filter((s) => s.value && s.title);
  }

  async resolve(input: { value: string; ref?: string }, ctx: GeoContext): Promise<ResolvedAddress | null> {
    const params = new URLSearchParams({ apikey: this.geocoderKey, lang: "ru_RU", format: "json", results: "1" });
    if (input.ref) params.set("uri", input.ref);
    else params.set("geocode", input.value);
    const res = await fetch(`https://geocode-maps.yandex.ru/v1?${params}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Геокодер ответил ${res.status}`);
    const data = (await res.json()) as GeocoderResponse;
    const obj = data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    const pos = obj?.Point?.pos?.split(" ").map(Number);
    if (!obj || !pos || pos.length !== 2 || pos.some((n) => !Number.isFinite(n))) return null;
    // Геокодер отдаёт «долгота широта». В одном из примеров документации порядок обратный,
    // поэтому выбираем вариант, который ближе к ресторану.
    const [a, b] = pos as [number, number];
    const lonLat = { lat: b, lng: a };
    const latLon = { lat: a, lng: b };
    const point = distanceKm(lonLat, ctx.center) <= distanceKm(latLon, ctx.center) ? lonLat : latLon;
    const meta = obj.metaDataProperty?.GeocoderMetaData;
    return {
      ...point,
      value: meta?.Address?.formatted ?? meta?.text ?? input.value,
      precision: mapPrecision(meta?.kind, meta?.precision),
    };
  }
}
