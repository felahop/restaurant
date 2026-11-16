import { z } from "zod";
import { toE164 } from "@/lib/phone";
import { issueOtp } from "@/server/auth/otp";
import { clientIp, isSameOrigin, jsonError } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { demoSmsAllowed, getSms } from "@/server/sms";

const schema = z.object({ phone: z.string().max(30), consent: z.literal(true) });
const RESEND_SECONDS = 60;

/** Шаг 1 входа: код по SMS. Лимиты: раз в минуту на номер, 5 кодов за час на номер, 20 — на IP. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Запрос с другого сайта");
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Укажите телефон и согласие на обработку данных");
  const phone = toE164(parsed.data.phone);
  if (!phone) return jsonError(400, "Проверьте номер: нужно 10 цифр после +7", { field: "phone" });

  const sms = getSms();
  if (!sms) return jsonError(503, "Вход по коду пока недоступен. Заказ можно оформить и без входа.");

  const [cool, perPhone, perIp] = await Promise.all([
    rateLimit(`otp-cool:${phone}`, 1, RESEND_SECONDS - 5),
    rateLimit(`otp-phone:${phone}`, 5, 3600),
    rateLimit(`otp-ip:${clientIp(request)}`, 20, 3600),
  ]);
  if (!cool.ok) return jsonError(429, `Код уже отправлен. Повторить можно через ${cool.retryAfter} с`, { retryAfter: cool.retryAfter });
  if (!perPhone.ok || !perIp.ok) return jsonError(429, "Слишком много кодов. Попробуйте через час или позвоните нам.");

  const code = await issueOtp(phone);
  await sms.send(phone, `Код для входа: ${code}. Никому его не сообщайте.`);
  return Response.json({ ok: true, resendIn: RESEND_SECONDS, ...(demoSmsAllowed() ? { demoCode: code } : {}) });
}
