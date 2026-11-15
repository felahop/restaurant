"use server";

import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/admin/result";
import { statusLabel } from "@/lib/order/status";
import { audit } from "@/server/admin/audit";
import { AdminAccessError, assertAdmin } from "@/server/admin/auth";
import { changeOrderStatus, TransitionError } from "@/server/admin/orders";

const statusSchema = z.enum(["ACCEPTED", "COOKING", "DELIVERING", "READY", "COMPLETED", "CANCELED"]);

export async function setOrderStatusAction(orderId: string, status: string, reason?: string): Promise<ActionResult> {
  try {
    const admin = await assertAdmin("orders");
    const parsed = statusSchema.safeParse(status);
    if (!parsed.success || typeof orderId !== "string") return fail("Неизвестный статус");
    if (parsed.data === "CANCELED" && (!reason || reason.trim().length < 3)) return fail("Укажите причину отмены");
    const why = reason?.trim().slice(0, 300);
    const { number, from, type } = await changeOrderStatus(orderId, parsed.data, why);
    await audit(admin, {
      section: "orders",
      action: parsed.data === "CANCELED" ? "order.cancel" : "order.status",
      entityId: orderId,
      summary:
        `Заказ №${number}: ${statusLabel(from, type)} → ${statusLabel(parsed.data, type)}` +
        (parsed.data === "CANCELED" && why ? `. Причина: ${why}` : ""),
      meta: { from, to: parsed.data },
    });
    return ok(`Заказ №${number}: статус обновлён`);
  } catch (e) {
    if (e instanceof AdminAccessError || e instanceof TransitionError) return fail(e.message);
    throw e;
  }
}
