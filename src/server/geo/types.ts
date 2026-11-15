import type { LatLng } from "@/lib/geo/polygon";

/** Подсказка адреса при вводе. */
export type AddressSuggestion = {
  /** Полная строка адреса для поля ввода. */
  value: string;
  title: string;
  subtitle?: string;
  /** Ссылка поставщика для точного геокодирования (uri Яндекса, unrestricted_value DaData). */
  ref?: string;
};

/** Точность найденной точки: доставка возможна только до дома. */
export type AddressPrecision = "house" | "street" | "other";

export type ResolvedAddress = LatLng & { value: string; precision: AddressPrecision };

export type GeoContext = {
  center: LatLng;
  city: string;
  /** Окно поиска: [юго-запад, северо-восток]. */
  bbox?: [LatLng, LatLng];
};

/** Сменный модуль подсказок и геокодирования (Яндекс, DaData или демо-заглушка). */
export interface GeoProvider {
  readonly name: string;
  suggest(query: string, ctx: GeoContext): Promise<AddressSuggestion[]>;
  resolve(input: { value: string; ref?: string }, ctx: GeoContext): Promise<ResolvedAddress | null>;
}
