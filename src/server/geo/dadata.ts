import "server-only";
import type { AddressPrecision, AddressSuggestion, GeoContext, GeoProvider, ResolvedAddress } from "./types";

/**
 * DaData: подсказки по адресам. Координаты заполняются при выборе конкретной подсказки
 * (запрос с count = 1 и текстом из unrestricted_value).
 * Документация: https://dadata.ru/api/suggest/address/
 * Ключ: DADATA_API_KEY.
 */

const URL = "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address";
const TIMEOUT_MS = 4000;

type DadataResponse = {
  suggestions?: {
    value: string;
    unrestricted_value: string;
    data?: { geo_lat?: string | null; geo_lon?: string | null; qc_geo?: string | null; house?: string | null };
  }[];
};

function precisionFromQc(qc?: string | null): AddressPrecision {
  // 0 — точные координаты, 1 — ближайший дом, 2 — улица, 3+ — населённый пункт и грубее.
  if (qc === "0" || qc === "1") return "house";
  if (qc === "2") return "street";
  return "other";
}

export class DadataGeoProvider implements GeoProvider {
  readonly name = "dadata";
  constructor(private readonly apiKey: string) {}

  private async call(body: object): Promise<DadataResponse> {
    const res = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Token ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`DaData ответила ${res.status}`);
    return (await res.json()) as DadataResponse;
  }

  async suggest(query: string, ctx: GeoContext): Promise<AddressSuggestion[]> {
    const data = await this.call({ query: query.slice(0, 300), count: 7, locations: [{ city: ctx.city }] });
    return (data.suggestions ?? []).map((s) => ({
      value: s.value,
      title: s.value,
      ref: s.unrestricted_value,
    }));
  }

  async resolve(input: { value: string; ref?: string }): Promise<ResolvedAddress | null> {
    const data = await this.call({ query: (input.ref ?? input.value).slice(0, 300), count: 1 });
    const s = data.suggestions?.[0];
    const lat = Number(s?.data?.geo_lat);
    const lng = Number(s?.data?.geo_lon);
    if (!s || !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
    return { lat, lng, value: s.value, precision: precisionFromQc(s.data?.qc_geo) };
  }
}
