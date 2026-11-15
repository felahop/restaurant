import { connection } from "next/server";
import { AdminAccessError, assertAdmin } from "@/server/admin/auth";
import { listOrders, type FeedFilter } from "@/server/admin/orders";
import { jsonError } from "@/server/http";

const FILTERS: FeedFilter[] = ["active", "awaiting", "done", "canceled", "all"];

/** Лента заказов для админки (опрашивается каждые 5 секунд). */
export async function GET(request: Request) {
  await connection();
  try {
    await assertAdmin("orders");
  } catch (e) {
    if (e instanceof AdminAccessError) return jsonError(401, e.message);
    throw e;
  }
  const url = new URL(request.url);
  const filterParam = url.searchParams.get("filter") as FeedFilter | null;
  const filter = filterParam && FILTERS.includes(filterParam) ? filterParam : "active";
  const data = await listOrders({ date: url.searchParams.get("date"), filter });
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}
