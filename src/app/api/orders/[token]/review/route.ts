import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { clientIp, isSameOrigin, jsonError } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(10, "Напишите хотя бы 10 символов").max(1000),
  name: z.string().trim().min(1, "Как вас подписать?").max(40),
});

/** Отзыв о выполненном заказе: один на заказ, публикуется после проверки в админ-панели. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!isSameOrigin(request)) return jsonError(403, "Запрос с другого сайта");
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return jsonError(404, "Заказ не найден");
  const limit = await rateLimit(`review:${clientIp(request)}`, 5, 3600);
  if (!limit.ok) return jsonError(429, "Слишком много отзывов подряд. Попробуйте позже.");

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Проверьте отзыв");
  const order = await db.order.findUnique({ where: { publicToken: token }, select: { id: true, status: true, userId: true } });
  if (!order) return jsonError(404, "Заказ не найден");
  if (order.status !== "COMPLETED") return jsonError(409, "Отзыв можно оставить после получения заказа");

  try {
    await db.review.create({
      data: { orderId: order.id, userId: order.userId, authorName: parsed.data.name, rating: parsed.data.rating, text: parsed.data.text },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return jsonError(409, "Отзыв на этот заказ уже есть — спасибо!");
    throw e;
  }
  return Response.json({ ok: true }, { status: 201 });
}
