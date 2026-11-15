"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { fail, ok, zodFields, type ActionResult } from "@/lib/admin/result";
import { normalizePromoCode } from "@/lib/order/calc";
import { audit } from "@/server/admin/audit";
import { guardAction } from "@/server/admin/guard";
import { PROMOTIONS_TAG } from "@/server/content";
import { db } from "@/server/db";

const date = z
  .string()
  .nullable()
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Некорректная дата");

const promoSchema = z
  .object({
    code: z.string().trim().min(3, "Код — от 3 символов").max(30).transform(normalizePromoCode),
    type: z.enum(["PERCENT", "FIXED"]),
    value: z.number().positive(),
    minOrder: z.number().min(0).nullable(),
    startsAt: date,
    endsAt: date,
    usageLimit: z.number().int().min(1).nullable(),
    isActive: z.boolean(),
  })
  .refine((p) => p.type !== "PERCENT" || p.value <= 100, { message: "Процент — не больше 100", path: ["value"] })
  .refine((p) => !p.startsAt || !p.endsAt || p.startsAt < p.endsAt, { message: "Окончание раньше начала", path: ["endsAt"] });

export type PromoInput = z.input<typeof promoSchema>;

export async function savePromoCodeAction(id: string | null, input: PromoInput): Promise<ActionResult> {
  const g = await guardAction("marketing");
  if ("denied" in g) return g.denied;
  const parsed = promoSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Проверьте поля", zodFields(parsed.error.issues));
  const p = parsed.data;
  const data = {
    ...p,
    // Процент храним как есть, сумму и минимальный заказ — в копейках.
    value: p.type === "PERCENT" ? Math.round(p.value) : Math.round(p.value * 100),
    minOrder: p.minOrder == null ? null : Math.round(p.minOrder * 100),
  };
  const clash = await db.promoCode.findUnique({ where: { code: data.code }, select: { id: true } });
  if (clash && clash.id !== id) return fail("Такой код уже есть", { code: "Такой код уже есть" });
  const saved = id ? await db.promoCode.update({ where: { id }, data }) : await db.promoCode.create({ data });
  await audit(g.admin, {
    section: "marketing",
    action: id ? "promo.update" : "promo.create",
    entityId: saved.id,
    summary:
      `${id ? "Изменил" : "Создал"} промокод ${saved.code}: ` +
      (saved.type === "PERCENT" ? `${saved.value} %` : `${saved.value / 100} ₽`) +
      (saved.isActive ? "" : " (выключен)"),
  });
  return ok("Промокод сохранён");
}

export async function deletePromoCodeAction(id: string): Promise<ActionResult> {
  const g = await guardAction("marketing");
  if ("denied" in g) return g.denied;
  const used = await db.order.count({ where: { promoCodeId: id } });
  if (used) {
    const promo = await db.promoCode.update({ where: { id }, data: { isActive: false }, select: { code: true } });
    await audit(g.admin, { section: "marketing", action: "promo.disable", entityId: id, summary: `Выключил промокод ${promo.code}` });
    return ok("Промокод использовали в заказах — он выключен, а не удалён");
  }
  const promo = await db.promoCode.delete({ where: { id }, select: { code: true } });
  await audit(g.admin, { section: "marketing", action: "promo.delete", entityId: id, summary: `Удалил промокод ${promo.code}` });
  return ok("Промокод удалён");
}

const promotionSchema = z
  .object({
    kind: z.enum(["PROMO", "BANNER"]),
    badge: z.string().trim().max(20).nullable(),
    title: z.string().trim().min(2).max(80),
    text: z.string().trim().min(2).max(300),
    period: z.string().trim().max(80).nullable(),
    kanji: z.string().trim().max(2).nullable(),
    imageUrl: z.string().max(500).nullable(),
    ctaLabel: z.string().trim().max(40).nullable(),
    ctaHref: z
      .string()
      .trim()
      .max(300)
      .refine((v) => v.startsWith("/") || v.startsWith("https://"), "Ссылка должна начинаться с / или https://")
      .nullable(),
    startsAt: date,
    endsAt: date,
    isActive: z.boolean(),
    sortOrder: z.number().int().min(0).max(10_000),
  })
  .refine((p) => !p.startsAt || !p.endsAt || p.startsAt < p.endsAt, { message: "Окончание раньше начала", path: ["endsAt"] });

export type PromotionInput = z.input<typeof promotionSchema>;

export async function savePromotionAction(id: string | null, input: PromotionInput): Promise<ActionResult> {
  const g = await guardAction("marketing");
  if ("denied" in g) return g.denied;
  const parsed = promotionSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Проверьте поля", zodFields(parsed.error.issues));
  const saved = id
    ? await db.promotion.update({ where: { id }, data: parsed.data })
    : await db.promotion.create({ data: parsed.data });
  updateTag(PROMOTIONS_TAG);
  const kind = saved.kind === "BANNER" ? "баннер" : "акцию";
  await audit(g.admin, {
    section: "marketing",
    action: id ? "promotion.update" : "promotion.create",
    entityId: saved.id,
    summary: `${id ? "Изменил" : "Создал"} ${kind} «${saved.title}»${saved.isActive ? "" : " (выключена)"}`,
  });
  return ok("Акция сохранена");
}

export async function deletePromotionAction(id: string): Promise<ActionResult> {
  const g = await guardAction("marketing");
  if ("denied" in g) return g.denied;
  const removed = await db.promotion.delete({ where: { id }, select: { title: true, kind: true } });
  updateTag(PROMOTIONS_TAG);
  await audit(g.admin, {
    section: "marketing",
    action: "promotion.delete",
    entityId: id,
    summary: `Удалил ${removed.kind === "BANNER" ? "баннер" : "акцию"} «${removed.title}»`,
  });
  return ok("Акция удалена");
}
