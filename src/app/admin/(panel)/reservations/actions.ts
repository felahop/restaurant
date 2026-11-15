"use server";

import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/admin/result";
import { guardAction } from "@/server/admin/guard";
import { db } from "@/server/db";

export async function setReservationStatusAction(id: string, status: string): Promise<ActionResult> {
  const g = await guardAction("reservations");
  if ("denied" in g) return g.denied;
  const parsed = z.enum(["NEW", "CONFIRMED", "COMPLETED", "CANCELED"]).safeParse(status);
  if (!parsed.success) return fail("Неизвестный статус");
  await db.reservation.update({ where: { id }, data: { status: parsed.data } });
  return ok("Статус брони обновлён");
}
