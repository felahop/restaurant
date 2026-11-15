"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { weekHoursSchema } from "@/lib/admin/hours";
import { fail, ok, zodFields, type ActionResult } from "@/lib/admin/result";
import { audit } from "@/server/admin/audit";
import { guardAction } from "@/server/admin/guard";
import { db } from "@/server/db";
import { SETTINGS_TAG } from "@/server/settings";
import { ZONES_TAG } from "@/server/zones";

export async function setOrdersPausedAction(paused: boolean): Promise<ActionResult> {
  const g = await guardAction("delivery");
  if ("denied" in g) return g.denied;
  await db.settings.update({ where: { id: 1 }, data: { ordersPaused: Boolean(paused) } });
  updateTag(SETTINGS_TAG);
  await audit(g.admin, {
    section: "delivery",
    action: paused ? "orders.pause" : "orders.resume",
    summary: paused ? "Остановил приём заказов" : "Возобновил приём заказов",
  });
  return ok(paused ? "Приём заказов остановлен" : "Приём заказов возобновлён");
}

export async function saveOrderHoursAction(input: z.input<typeof weekHoursSchema>): Promise<ActionResult> {
  const g = await guardAction("delivery");
  if ("denied" in g) return g.denied;
  const parsed = weekHoursSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Проверьте часы");
  await db.settings.update({ where: { id: 1 }, data: { orderHours: parsed.data } });
  updateTag(SETTINGS_TAG);
  await audit(g.admin, { section: "delivery", action: "orderHours.update", summary: "Изменил часы приёма заказов" });
  return ok("Часы приёма заказов сохранены");
}

const rub = z.number().min(0).max(100_000).transform((v) => Math.round(v * 100));
const zoneSchema = z.object({
  name: z.string().trim().min(2).max(60),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Цвет в формате #rrggbb"),
  fee: rub,
  minOrder: rub,
  freeFrom: rub.nullable(),
  etaMinutes: z.number().int().min(5).max(300),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
  polygon: z
    .array(z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]))
    .min(3, "Нужно минимум 3 точки")
    .max(200),
});
export type ZoneInput = z.input<typeof zoneSchema>;

export async function saveZoneAction(id: string | null, input: ZoneInput): Promise<ActionResult> {
  const g = await guardAction("delivery");
  if ("denied" in g) return g.denied;
  const parsed = zoneSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Проверьте поля", zodFields(parsed.error.issues));
  const zone = id
    ? await db.deliveryZone.update({ where: { id }, data: parsed.data })
    : await db.deliveryZone.create({ data: parsed.data });
  updateTag(ZONES_TAG);
  await audit(g.admin, {
    section: "delivery",
    action: id ? "zone.update" : "zone.create",
    entityId: zone.id,
    summary: `${id ? "Изменил" : "Создал"} зону «${zone.name}»: доставка ${zone.fee / 100} ₽, минимум ${zone.minOrder / 100} ₽` + (zone.isActive ? "" : " (выключена)"),
  });
  return ok("Зона сохранена");
}

export async function deleteZoneAction(id: string): Promise<ActionResult> {
  const g = await guardAction("delivery");
  if ("denied" in g) return g.denied;
  const zone = await db.deliveryZone.delete({ where: { id }, select: { name: true } });
  updateTag(ZONES_TAG);
  await audit(g.admin, { section: "delivery", action: "zone.delete", entityId: id, summary: `Удалил зону «${zone.name}»` });
  return ok("Зона удалена");
}
