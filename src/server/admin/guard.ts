import "server-only";
import { fail, type ActionResult } from "@/lib/admin/result";
import { AdminAccessError, assertAdmin, type CurrentAdmin } from "./auth";
import type { AdminSection } from "./roles";

/** Проверка прав в серверном действии: возвращает сотрудника или готовый ответ с ошибкой. */
export async function guardAction(section: AdminSection): Promise<{ admin: CurrentAdmin } | { denied: ActionResult<never> }> {
  try {
    return { admin: await assertAdmin(section) };
  } catch (e) {
    if (e instanceof AdminAccessError) return { denied: fail(e.message) };
    throw e;
  }
}
