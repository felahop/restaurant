"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { weekHoursSchema } from "@/lib/admin/hours";
import { fail, ok, zodFields, type ActionResult } from "@/lib/admin/result";
import { toE164 } from "@/lib/phone";
import { audit } from "@/server/admin/audit";
import { guardAction } from "@/server/admin/guard";
import { db } from "@/server/db";
import { SETTINGS_TAG } from "@/server/settings";

const url = z.union([z.literal(""), z.url("Нужна ссылка вида https://…").max(300)]);
const timeZones = new Set(Intl.supportedValuesOf("timeZone"));

const settingsSchema = z.object({
  name: z.string().trim().min(1).max(60),
  tagline: z.string().trim().max(120),
  description: z.string().trim().max(300),
  legalName: z.string().trim().max(200),
  city: z.string().trim().min(1).max(60),
  addressFull: z.string().trim().min(5).max(200),
  addressShort: z.string().trim().min(3).max(120),
  metro: z.string().trim().max(120),
  parking: z.string().trim().max(300),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  timezone: z.string().refine((tz) => timeZones.has(tz), "Неизвестный часовой пояс"),
  phoneDisplay: z.string().trim().min(5).max(30),
  email: z.union([z.literal(""), z.email("Проверьте почту")]),
  telegramUrl: url,
  whatsappUrl: url,
  vkUrl: url,
  openingHours: weekHoursSchema,
  topBarItems: z.array(z.string().trim().min(1).max(60)).max(4),
  etaFromMin: z.number().int().min(5).max(240),
  etaToMin: z.number().int().min(5).max(300),
  pickupMinutes: z.number().int().min(5).max(180),
  bonusEarnPercent: z.number().int().min(0).max(50),
  bonusMaxSpendPercent: z.number().int().min(0).max(100),
  scheduleStepMinutes: z.number().int().min(5).max(60),
  scheduleLeadMinutes: z.number().int().min(0).max(240),
  scheduleDaysAhead: z.number().int().min(1).max(7),
  preorderAlertMinutes: z.number().int().min(15).max(24 * 60),
  bookingCapacity: z.number().int().min(1).max(1000),
  bookingDurationMinutes: z.number().int().min(30).max(6 * 60),
});

export type SettingsInput = z.input<typeof settingsSchema>;

export async function saveSettingsAction(input: SettingsInput): Promise<ActionResult> {
  const g = await guardAction("settings");
  if ("denied" in g) return g.denied;
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return fail("Проверьте поля", zodFields(parsed.error.issues));
  const d = parsed.data;
  if (d.etaFromMin > d.etaToMin) return fail("Время доставки «от» больше, чем «до»", { etaFromMin: "Больше, чем «до»" });
  const phoneE164 = toE164(d.phoneDisplay);
  if (!phoneE164) return fail("Проверьте телефон", { phoneDisplay: "Нужен номер +7 и 10 цифр" });
  await db.settings.update({
    where: { id: 1 },
    data: {
      ...d,
      phoneE164,
      email: d.email,
      telegramUrl: d.telegramUrl || null,
      whatsappUrl: d.whatsappUrl || null,
      vkUrl: d.vkUrl || null,
    },
  });
  updateTag(SETTINGS_TAG);
  await audit(g.admin, { section: "settings", action: "settings.update", summary: "Изменил настройки ресторана" });
  return ok("Настройки сохранены — сайт уже обновился");
}
