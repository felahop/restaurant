import { destroyUserSession } from "@/server/auth/user";
import { isSameOrigin, jsonError } from "@/server/http";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Запрос с другого сайта");
  await destroyUserSession();
  return Response.json({ ok: true });
}
