import "server-only";
import { DadataGeoProvider } from "./dadata";
import { MockGeoProvider } from "./mock";
import type { GeoProvider } from "./types";
import { YandexGeoProvider } from "./yandex";

/**
 * Выбор модуля: GEO_PROVIDER=yandex|dadata|mock. По умолчанию — Яндекс при наличии ключей, иначе демо.
 */
export function getGeoProvider(): GeoProvider {
  const preferred = process.env.GEO_PROVIDER;
  const ySuggest = process.env.YANDEX_GEOSUGGEST_API_KEY;
  const yGeocoder = process.env.YANDEX_GEOCODER_API_KEY;
  const dadata = process.env.DADATA_API_KEY;

  if ((preferred === "yandex" || !preferred) && ySuggest && yGeocoder)
    return new YandexGeoProvider(ySuggest, yGeocoder);
  if ((preferred === "dadata" || !preferred) && dadata) return new DadataGeoProvider(dadata);
  return new MockGeoProvider();
}

export type { AddressSuggestion, GeoContext, GeoProvider, ResolvedAddress } from "./types";
