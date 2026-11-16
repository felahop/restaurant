import { calculateQuote } from "@/lib/order/calc";
import { quoteRequestSchema } from "@/lib/order/schemas";
import { getUser } from "@/server/auth/user";
import { loadQuoteContext, pointFromToken, scheduleInfo } from "@/server/checkout";
import { clientIp, isSameOrigin, jsonError } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

/** Предварительный расчёт корзины: суммы, доставка, промокод и доступное время. Ничего не сохраняет. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Запрос с другого сайта");
  const limit = await rateLimit(`quote:${clientIp(request)}`, 120, 60);
  if (!limit.ok) return jsonError(429, "Слишком много запросов. Подождите минуту.", { retryAfter: limit.retryAfter });

  const parsed = quoteRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Некорректные данные корзины");
  const input = parsed.data;

  const now = new Date();
  const address = pointFromToken(input.addressToken);
  if (input.addressToken && !address)
    return jsonError(400, "Адрес устарел — выберите его ещё раз", { code: "ADDRESS_EXPIRED" });

  const user = await getUser();
  const ctx = await loadQuoteContext(input.items, input.promoCode, now, user?.id);
  const quote = calculateQuote({ ...input, point: address, bonusToSpend: input.useBonus ? ctx.bonus?.balance : 0 }, ctx);
  return Response.json({ quote, schedule: await scheduleInfo(now) });
}
