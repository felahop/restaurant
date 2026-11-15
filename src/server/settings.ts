import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { WeekHours } from "@/lib/order/schedule";
import { db } from "@/server/db";

export const SETTINGS_TAG = "settings";

export type SiteSettings = Awaited<ReturnType<typeof loadSettings>>;

async function loadSettings() {
  const s = await db.settings.findUnique({ where: { id: 1 } });
  if (!s) throw new Error("Нет настроек ресторана: выполните npm run db:seed");
  return {
    ...s,
    openingHours: s.openingHours as WeekHours,
    orderHours: s.orderHours as WeekHours,
    updatedAt: s.updatedAt.toISOString(),
  };
}

/** Настройки ресторана из базы (правятся в админ-панели, кэш сбрасывается тегом settings). */
export async function getSettings() {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("hours");
  return loadSettings();
}
