import { connection } from "next/server";
import { db } from "@/server/db";
import { clientIp, jsonError } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

/** Статус заказа для страницы гостя (опрашивается раз в несколько секунд). Без персональных данных. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return jsonError(404, "Заказ не найден");
  const limit = await rateLimit(`status:${clientIp(request)}`, 120, 60);
  if (!limit.ok) return jsonError(429, "Слишком часто", { retryAfter: limit.retryAfter });

  const order = await db.order.findUnique({
    where: { publicToken: token },
    select: {
      number: true,
      type: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
      cancelReason: true,
      acceptedAt: true,
      cookingAt: true,
      deliveringAt: true,
      readyAt: true,
      completedAt: true,
      canceledAt: true,
      updatedAt: true,
      review: { select: { id: true } },
      refundStatus: true,
    },
  });
  if (!order) return jsonError(404, "Заказ не найден");
  const { review, ...rest } = order;
  return Response.json({ ...rest, hasReview: Boolean(review) }, { headers: { "Cache-Control": "no-store" } });
}
