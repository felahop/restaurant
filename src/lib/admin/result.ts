/** Результат серверного действия админки. */
export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fields?: Record<string, string> };

export const ok = <T,>(message?: string, data?: T): ActionResult<T> => ({ ok: true, message, data });
export const fail = (error: string, fields?: Record<string, string>): ActionResult<never> => ({ ok: false, error, fields });

/** Ошибки Zod → { поле: сообщение }. */
export function zodFields(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const i of issues) {
    const key = i.path.map(String).join(".");
    if (!fields[key]) fields[key] = i.message;
  }
  return fields;
}
