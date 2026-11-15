import { ANALYTICS_PERIODS, parsePeriod } from "@/lib/admin/analytics";
import { rubCell, toCsv } from "@/lib/csv";
import { paymentLabels } from "@/lib/order/schemas";
import { statusLabel } from "@/lib/order/status";
import { getExportRows } from "@/server/admin/analytics";
import { audit } from "@/server/admin/audit";
import { AdminAccessError, assertAdmin } from "@/server/admin/auth";

const KINDS = { orders: "заказы", revenue: "выручка", dishes: "блюда" } as const;
type Kind = keyof typeof KINDS;

/** CSV-выгрузка для владельца: /api/admin/export/orders|revenue|dishes?period=day|week|month. */
export async function GET(request: Request, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  if (!(kind in KINDS)) return new Response("Not found", { status: 404 });
  let admin;
  try {
    admin = await assertAdmin("analytics");
  } catch (e) {
    if (e instanceof AdminAccessError) return new Response(e.message, { status: 403 });
    throw e;
  }
  const period = parsePeriod(new URL(request.url).searchParams.get("period"));
  const data = await getExportRows(kind as Kind, period);
  const dt = (d: Date) =>
    new Intl.DateTimeFormat("ru-RU", { timeZone: data.timezone, dateStyle: "short", timeStyle: "short" }).format(d);

  let csv: string;
  if (data.kind === "orders") {
    csv = toCsv(
      ["Номер", "Создан", "Ко времени", "Получение", "Статус", "Способ оплаты", "Оплачен онлайн", "Блюда, ₽", "Доставка, ₽", "Скидка, ₽", "Бонусами, ₽", "Итого, ₽", "Промокод", "Зона", "Причина отмены"],
      data.orders.map((o) => [
        o.number,
        dt(o.createdAt),
        o.scheduledFor ? dt(o.scheduledFor) : "сразу",
        o.type === "DELIVERY" ? "Доставка" : "Самовывоз",
        statusLabel(o.status, o.type),
        paymentLabels[o.paymentMethod],
        o.paymentStatus === "SUCCEEDED" ? "да" : "нет",
        rubCell(o.subtotal),
        rubCell(o.deliveryFee),
        rubCell(o.discount),
        rubCell(o.bonusSpent),
        rubCell(o.total),
        o.promoCodeRaw,
        o.zone?.name,
        o.cancelReason,
      ]),
    );
  } else if (data.kind === "dishes") {
    csv = toCsv(["Блюдо", "Порций", "Сумма, ₽"], data.dishes.map((d) => [d.name, d.quantity, rubCell(d.revenue)]));
  } else {
    csv = toCsv(["Период", "Заказов", "Выручка, ₽"], data.series.map((b) => [b.label, b.orders, rubCell(b.revenue)]));
  }

  const label = ANALYTICS_PERIODS.find((p) => p.value === period)!.label.toLowerCase();
  await audit(admin, { section: "analytics", action: "export.csv", summary: `Выгрузил CSV: ${KINDS[kind as Kind]}, ${label}` });
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: data.timezone }).format(data.range.from);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${kind}-${period}-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
