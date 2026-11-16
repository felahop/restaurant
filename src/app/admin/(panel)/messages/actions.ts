"use server";

import { ok, type ActionResult } from "@/lib/admin/result";
import { audit } from "@/server/admin/audit";
import { guardAction } from "@/server/admin/guard";
import { db } from "@/server/db";

export async function setMessageHandledAction(id: string, handled: boolean): Promise<ActionResult> {
  const g = await guardAction("messages");
  if ("denied" in g) return g.denied;
  const m = await db.contactMessage.update({ where: { id }, data: { handledAt: handled ? new Date() : null }, select: { name: true } });
  await audit(g.admin, {
    section: "messages",
    action: handled ? "message.handled" : "message.reopen",
    entityId: id,
    summary: `${handled ? "Обработал" : "Вернул в работу"} сообщение с сайта от ${m.name}`,
  });
  return ok(handled ? "Отмечено как обработанное" : "Сообщение снова в работе");
}
