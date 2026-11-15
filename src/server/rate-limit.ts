import "server-only";
import { db } from "@/server/db";

/**
 * Ограничение частоты в окне фиксированной длины. Хранится в PostgreSQL одной атомарной командой,
 * поэтому работает и при нескольких экземплярах приложения.
 */
/** Множитель лимитов для автотестов (RATE_LIMIT_SCALE=50). В продакшене не задавайте. */
const SCALE = Math.max(1, Number(process.env.RATE_LIMIT_SCALE) || 1);

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ ok: boolean; retryAfter: number }> {
  limit = limit * SCALE;
  const rows = await db.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= now() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= now() THEN now() + make_interval(secs => ${windowSeconds}) ELSE "RateLimit"."resetAt" END
    RETURNING "count", "resetAt"`;
  const row = rows[0];
  if (!row) return { ok: true, retryAfter: 0 };
  const retryAfter = Math.max(0, Math.ceil((new Date(row.resetAt).getTime() - Date.now()) / 1000));
  return { ok: Number(row.count) <= limit, retryAfter };
}
