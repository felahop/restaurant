import { createHash, timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { sendDuePreorderReminders } from "@/server/order-notify";

const digest = (s: string) => createHash("sha256").update(s).digest();

/**
 * Напоминания о предзаказах по расписанию (страховка, если лента заказов закрыта).
 * Пример для crontab на сервере (каждые 5 минут):
 *   *\/5 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://<домен>/api/cron/preorder-reminders
 * Без CRON_SECRET адрес отключён.
 */
export async function POST(request: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("Not found", { status: 404 });
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!timingSafeEqual(digest(given), digest(secret))) return new Response("Forbidden", { status: 403 });
  const sent = await sendDuePreorderReminders();
  return Response.json({ sent });
}
