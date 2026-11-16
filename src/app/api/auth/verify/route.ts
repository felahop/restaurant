import { z } from "zod";
import { toE164 } from "@/lib/phone";
import { CONSENT_VERSION } from "@/server/auth/consent";
import { verifyOtp } from "@/server/auth/otp";
import { createUserSession } from "@/server/auth/user";
import { db } from "@/server/db";
import { clientIp, isSameOrigin, jsonError } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

const schema = z.object({ phone: z.string().max(30), code: z.string().regex(/^\d{4}$/) });

const MESSAGES = {
  invalid: "Код не подошёл. Проверьте цифры.",
  expired: "Код устарел. Запросите новый.",
  locked: "Слишком много попыток. Запросите новый код.",
} as const;

/** Шаг 2 входа: проверка кода. Первый вход создаёт кабинет (с согласием, данным на шаге 1). */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Запрос с другого сайта");
  const limit = await rateLimit(`otp-verify-ip:${clientIp(request)}`, 30, 600);
  if (!limit.ok) return jsonError(429, "Слишком много попыток. Подождите 10 минут.");
  const parsed = schema.safeParse(await request.json().catch(() => null));
  const phone = parsed.success ? toE164(parsed.data.phone) : null;
  if (!parsed.success || !phone) return jsonError(400, "Введите 4 цифры из SMS");

  const result = await verifyOtp(phone, parsed.data.code);
  if (result !== "ok") return jsonError(result === "invalid" ? 401 : 410, MESSAGES[result], { code: result });

  const now = new Date();
  const user = await db.user.upsert({
    where: { phone },
    create: { phone, consentAt: now, consentVersion: CONSENT_VERSION },
    update: {},
    select: { id: true, name: true },
  });
  await createUserSession(user.id);
  return Response.json({ ok: true, name: user.name });
}
