import type { AddressSuggestion, GeoProvider, ResolvedAddress } from "./types";

/**
 * Демо-геокодер без ключей: небольшой справочник адресов с координатами.
 * Нужен для разработки и тестов. Включается автоматически, если ключи Яндекса/DaData не заданы.
 * TODO: при смене города замените адреса.
 */
export const MOCK_ADDRESSES: ResolvedAddress[] = [
  { value: "Москва, Мясницкая улица, 20", lat: 55.7626, lng: 37.6352, precision: "house" },
  { value: "Москва, улица Покровка, 12", lat: 55.7593, lng: 37.6424, precision: "house" },
  { value: "Москва, улица Маросейка, 7", lat: 55.7576, lng: 37.6352, precision: "house" },
  { value: "Москва, Садовая-Черногрязская улица, 8", lat: 55.7665, lng: 37.6532, precision: "house" },
  { value: "Москва, Бауманская улица, 35", lat: 55.7738, lng: 37.6799, precision: "house" },
  { value: "Москва, Большая Пироговская улица, 2", lat: 55.7364, lng: 37.5752, precision: "house" },
  { value: "Москва, проспект Мира, 119", lat: 55.8314, lng: 37.6324, precision: "house" },
  { value: "Москва, Ленинградский проспект, 80", lat: 55.8079, lng: 37.5133, precision: "house" },
  { value: "Москва, Профсоюзная улица, 120", lat: 55.6339, lng: 37.5153, precision: "house" },
  { value: "Москва, Мясницкая улица", lat: 55.7637, lng: 37.6371, precision: "street" },
];

const normalize = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();

export class MockGeoProvider implements GeoProvider {
  readonly name = "mock";

  async suggest(query: string): Promise<AddressSuggestion[]> {
    const words = normalize(query).split(" ").filter(Boolean);
    if (!words.length) return [];
    return MOCK_ADDRESSES.filter((a) => words.every((w) => normalize(a.value).includes(w)))
      .slice(0, 7)
      .map((a) => {
        const [, ...rest] = a.value.split(", ");
        return { value: a.value, title: rest.join(", "), subtitle: "Москва", ref: a.value };
      });
  }

  async resolve(input: { value: string; ref?: string }): Promise<ResolvedAddress | null> {
    const key = normalize(input.ref ?? input.value);
    return MOCK_ADDRESSES.find((a) => normalize(a.value) === key) ?? null;
  }
}
