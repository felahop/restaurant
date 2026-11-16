import { after } from "next/server";
import { z } from "zod";
import { toE164 } from "@/lib/phone";
import { db } from "@/server/db";
import { clientIp, isSameOrigin, jsonError } from "@/server/http";
import { notifySafely } from "@/server/notify";
import { siteUrl } from "@/server/payments";
import { rateLimit } from "@/server/rate-limit";

const schema = z
  .object({
    name: z.string().trim().min(1, "Как к вам обращаться?").max(60),
    contact: z.string().trim().min(3, "Оставьте телефон или почту для ответа").max(120),
    message: z.string().trim().min(5, "Напишите сообщение").max(2000),
    consent: z.literal(true, { error: "Нужно согласие на обработку персональных данных" }),
  })
  .transform((v) => {
    const phone = toE164(v.contact);
    const email = !phone && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.contact) ? v.contact : null;
    return { ...v, phone, email };
  })
  .refine((v) => v.phone || v.email, { message: "Проверьте телефон или почту", path: ["contact"] });

/** Форма обратной связи на странице «Контакты». */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Запрос с другого сайта");
  const limit = await rateLimit(`contact:${clientIp(request)}`, 5, 3600);
  if (!limit.ok) return jsonError(429, "Слишком много сообщений подряд. Попробуйте позже или позвоните.");
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Проверьте поля", { field: parsed.error.issues[0]?.path[0] });
  const { name, phone, email, message } = parsed.data;
  await db.contactMessage.create({ data: { name, phone, email, message, consentAt: new Date() } });
  after(() => notifySafely((n) => n.newMessage({ adminUrl: `${siteUrl()}/admin/reviews#messages` })));
  return Response.json({ ok: true }, { status: 201 });
}
