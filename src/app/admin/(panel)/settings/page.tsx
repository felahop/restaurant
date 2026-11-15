import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { SettingsForm, type SettingsFormValues } from "@/components/admin/settings/SettingsForm";
import { WEEKDAYS, type WeekHoursInput } from "@/lib/admin/hours";
import { requireAdmin } from "@/server/admin/auth";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Настройки" };
/** Админка: переходы могут ждать данные (свежесть важнее мгновенного кадра). */
export const instant = false;

export default async function SettingsPage() {
  await requireAdmin("settings");
  const s = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
  const hours = s.openingHours as WeekHoursInput;
  const initial: SettingsFormValues = {
    name: s.name,
    tagline: s.tagline,
    description: s.description,
    legalName: s.legalName,
    city: s.city,
    addressFull: s.addressFull,
    addressShort: s.addressShort,
    metro: s.metro,
    parking: s.parking,
    lat: String(s.lat),
    lng: String(s.lng),
    timezone: s.timezone,
    phoneDisplay: s.phoneDisplay,
    email: s.email,
    telegramUrl: s.telegramUrl ?? "",
    whatsappUrl: s.whatsappUrl ?? "",
    vkUrl: s.vkUrl ?? "",
    openingHours: Object.fromEntries(WEEKDAYS.map((d) => [d, hours[d] ?? []])) as WeekHoursInput,
    topBarItems: s.topBarItems,
    etaFromMin: String(s.etaFromMin),
    etaToMin: String(s.etaToMin),
    pickupMinutes: String(s.pickupMinutes),
    bonusEarnPercent: String(s.bonusEarnPercent),
    bonusMaxSpendPercent: String(s.bonusMaxSpendPercent),
    scheduleStepMinutes: String(s.scheduleStepMinutes),
    scheduleLeadMinutes: String(s.scheduleLeadMinutes),
    scheduleDaysAhead: String(s.scheduleDaysAhead),
  };
  return (
    <div className="flex max-w-240 flex-col gap-2">
      <AdminPageHeader title="Настройки" description="Контакты, часы, тексты плашки и бонусы. Сайт обновляется сразу после сохранения." />
      <SettingsForm initial={initial} />
    </div>
  );
}
