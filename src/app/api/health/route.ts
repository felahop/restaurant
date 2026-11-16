import { connection } from "next/server";
import { db } from "@/server/db";

/** Проверка живости для Docker и мониторинга: приложение отвечает и база доступна. */
export async function GET() {
  await connection();
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, error: "database" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
