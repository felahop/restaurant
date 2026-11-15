"use server";

import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/admin/result";
import { AdminAccessError, assertAdmin } from "@/server/admin/auth";
import { changeOrderStatus, TransitionError } from "@/server/admin/orders";

const statusSchema = z.enum(["ACCEPTED", "COOKING", "DELIVERING", "READY", "COMPLETED", "CANCELED"]);

export async function setOrderStatusAction(orderId: string, status: string, reason?: string): Promise<ActionResult> {
  try {
    await assertAdmin("orders");
    const parsed = statusSchema.safeParse(status);
    if (!parsed.success || typeof orderId !== "string") return fail("Неизвестный статус");
    if (parsed.data === "CANCELED" && (!reason || reason.trim().length < 3)) return fail("Укажите причину отмены");
    const { number } = await changeOrderStatus(orderId, parsed.data, reason?.slice(0, 300));
    return ok(`Заказ №${number}: статус обновлён`);
  } catch (e) {
    if (e instanceof AdminAccessError || e instanceof TransitionError) return fail(e.message);
    throw e;
  }
}
