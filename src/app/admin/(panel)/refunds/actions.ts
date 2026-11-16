"use server";

import { fail, ok, type ActionResult } from "@/lib/admin/result";
import { guardAction } from "@/server/admin/guard";
import { approveRefund, declineRefund, RefundError } from "@/server/admin/refunds";

export async function approveRefundAction(orderId: string): Promise<ActionResult> {
  const g = await guardAction("refunds");
  if ("denied" in g) return g.denied;
  try {
    const status = await approveRefund(orderId, g.admin);
    if (status === "FAILED") return fail("Платёжный сервис не принял возврат. Попробуйте ещё раз или оформите его в кабинете сервиса.");
    return ok(status === "PENDING" ? "Возврат создан — сервис обрабатывает его" : "Деньги возвращены гостю");
  } catch (e) {
    if (e instanceof RefundError) return fail(e.message);
    throw e;
  }
}

export async function declineRefundAction(orderId: string, note: string): Promise<ActionResult> {
  const g = await guardAction("refunds");
  if ("denied" in g) return g.denied;
  const reason = note?.trim().slice(0, 300) ?? "";
  if (reason.length < 3) return fail("Укажите причину — её увидят в журнале");
  try {
    await declineRefund(orderId, reason, g.admin);
    return ok("Решение сохранено: без возврата");
  } catch (e) {
    if (e instanceof RefundError) return fail(e.message);
    throw e;
  }
}
