import "server-only";
import { connection } from "next/server";
import { formatWeekHours } from "@/lib/order/schedule";
import { getSettings } from "@/server/settings";

export type Messenger = { key: "telegram" | "whatsapp" | "vk"; href: string };

/** Публичные данные ресторана для сайта: из настроек админ-панели. */
export type SiteInfo = {
  name: string;
  description: string;
  legalName: string;
  addressFull: string;
  addressShort: string;
  metro: string;
  parking: string;
  lat: number;
  lng: number;
  phoneDisplay: string;
  phoneE164: string;
  email: string;
  messengers: Messenger[];
  hoursLines: string[];
  topBarItems: string[];
};

/**
 * Данные читаются во время запроса (connection), поэтому сборке не нужна база:
 * в статичной оболочке страницы на их месте — заглушки, сами значения приходят потоком из кэша.
 */
export async function getSiteInfo(): Promise<SiteInfo> {
  await connection();
  const s = await getSettings();
  const messengers: Messenger[] = [];
  if (s.telegramUrl) messengers.push({ key: "telegram", href: s.telegramUrl });
  if (s.whatsappUrl) messengers.push({ key: "whatsapp", href: s.whatsappUrl });
  if (s.vkUrl) messengers.push({ key: "vk", href: s.vkUrl });
  return {
    name: s.name,
    description: s.description,
    legalName: s.legalName,
    addressFull: s.addressFull,
    addressShort: s.addressShort,
    metro: s.metro,
    parking: s.parking,
    lat: s.lat,
    lng: s.lng,
    phoneDisplay: s.phoneDisplay,
    phoneE164: s.phoneE164,
    email: s.email,
    messengers,
    hoursLines: formatWeekHours(s.openingHours),
    topBarItems: s.topBarItems,
  };
}
