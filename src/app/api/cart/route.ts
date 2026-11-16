import { z } from "zod";
import { mergeCarts, parseStoredCart, type CartState } from "@/lib/cart/core";
import { getUser } from "@/server/auth/user";
import { db } from "@/server/db";
import { isSameOrigin, jsonError } from "@/server/http";

/**
 * Корзина аккаунта: браузер хранит корзину у себя, а после входа она привязывается к аккаунту
 * и доступна на других устройствах. Цены здесь не важны: при оформлении всё пересчитывается по базе.
 */
const bodySchema = z.object({ lines: z.array(z.unknown()).max(50), merge: z.boolean().default(false) });

async function stored(userId: string): Promise<CartState> {
  const row = await db.cart.findUnique({ where: { userId } });
  return parseStoredCart(row ? JSON.stringify(row.items) : null);
}

export async function GET() {
  const user = await getUser();
  if (!user) return jsonError(401, "Нужно войти");
  return Response.json(await stored(user.id), { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Запрос с другого сайта");
  const user = await getUser();
  if (!user) return jsonError(401, "Нужно войти");
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Некорректная корзина");
  // Та же проверка, что и для корзины в браузере: подозрительные строки отбрасываются.
  const incoming = parseStoredCart(JSON.stringify({ version: 1, lines: parsed.data.lines }));
  const next = parsed.data.merge ? mergeCarts(await stored(user.id), incoming) : incoming;
  await db.cart.upsert({
    where: { userId: user.id },
    create: { userId: user.id, items: next },
    update: { items: next },
  });
  return Response.json(next);
}
