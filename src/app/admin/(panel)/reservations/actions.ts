"use server";

import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/admin/result";
import { audit } from "@/server/admin/audit";
import { guardAction } from "@/server/admin/guard";
import { db } from "@/server/db";
import { getSettings } from "@/server/settings";

export async function setReservationStatusAction(id: string, status: string): Promise<ActionResult> {
  const g = await guardAction("reservations");
  if ("denied" in g) return g.denied;
  const parsed = z.enum(["NEW", "CONFIRMED", "COMPLETED", "CANCELED"]).safeParse(status);
  if (!parsed.success) return fail("Неизвестный статус");
  const r = await db.reservation.update({ where: { id }, data: { status: parsed.data }, select: { startsAt: true, guests: true } });
  const labels = { NEW: "новая", CONFIRMED: "подтверждена", COMPLETED: "состоялась", CANCELED: "отменена" } as const;
  const { timezone } = await getSettings();
  const when = r.startsAt.toLocaleString("ru-RU", { timeZone: timezone, day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  await audit(g.admin, {
    section: "reservations",
    action: "reservation.status",
    entityId: id,
    summary: `Бронь на ${when}, гостей: ${r.guests} — ${labels[parsed.data]}`,
  });
  return ok("Статус брони обновлён");
}
