import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone } from "lucide-react";
import { OrderActions } from "@/components/admin/orders/OrderActions";
import { Badge } from "@/components/ui/Badge";
import { formatRub } from "@/lib/money";
import { paymentLabels } from "@/lib/order/schemas";
import { statusLabel } from "@/lib/order/status";
import { requireAdmin } from "@/server/admin/auth";
import { getAdminOrder } from "@/server/admin/orders";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Заказ" };
/** Админка: переходы могут ждать данные (свежесть важнее мгновенного кадра). */
export const instant = false;

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("orders");
  const { id } = await params;
  const [order, settings] = await Promise.all([getAdminOrder(id), getSettings()]);
  if (!order) notFound();
  const fmt = (d: Date | null, withDate = false) =>
    d
      ? new Intl.DateTimeFormat("ru-RU", {
          timeZone: settings.timezone,
          hour: "2-digit",
          minute: "2-digit",
          ...(withDate ? { day: "numeric", month: "short" } : {}),
        }).format(d)
      : "—";

  const rows: [string, React.ReactNode][] = [
    ["Создан", fmt(order.createdAt, true)],
    ["Когда", order.scheduledFor ? `ко времени: ${fmt(order.scheduledFor, true)}` : "как можно скорее"],
    ["Получение", order.type === "DELIVERY" ? `Доставка${order.zone ? ` · зона «${order.zone.name}»` : ""}` : "Самовывоз"],
    ...(order.type === "DELIVERY"
      ? ([
          ["Адрес", order.addressText ?? "—"],
          [
            "Квартира / подъезд / этаж / домофон",
            [order.apartment, order.entrance, order.floor, order.intercom].map((v) => v || "—").join(" / "),
          ],
        ] as [string, React.ReactNode][])
      : []),
    ["Гость", order.customerName],
    [
      "Телефон",
      <a key="tel" href={`tel:${order.customerPhone}`} className="inline-flex items-center gap-0.5 font-semibold underline-offset-4 hover:underline">
        <Phone className="size-2" aria-hidden="true" />
        {order.customerPhone}
      </a>,
    ],
    ["Приборы", String(order.cutlery)],
    ["Комментарий", order.comment ?? "—"],
    ["Оплата", `${paymentLabels[order.paymentMethod]}${order.paymentStatus === "SUCCEEDED" ? " · оплачен" : order.paymentStatus === "CANCELED" ? " · оплата не прошла" : ""}`],
    ...(order.cancelReason ? ([["Причина отмены", order.cancelReason]] as [string, React.ReactNode][]) : []),
  ];

  return (
    <div className="flex max-w-200 flex-col gap-3">
      <Link href="/admin/orders" className="inline-flex min-h-5.5 items-center gap-1 self-start text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-2" aria-hidden="true" />К ленте заказов
      </Link>
      <div className="flex flex-wrap items-center gap-1.5">
        <h1 className="font-display text-h2">Заказ №{order.number}</h1>
        <Badge tone={order.status === "COMPLETED" ? "success" : order.status === "CANCELED" ? "soldOut" : "neutral"}>
          {statusLabel(order.status, order.type)}
        </Badge>
      </div>
      <OrderActions id={order.id} status={order.status} type={order.type} />

      <dl className="grid gap-x-3 gap-y-1 rounded-card border border-line bg-surface p-2 text-sm sm:grid-cols-[220px_1fr] md:p-3">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-fg-muted">{k}</dt>
            <dd className="text-fg">{v}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="items-title" className="rounded-card border border-line bg-surface p-2 md:p-3">
        <h2 id="items-title" className="mb-1 text-title font-semibold">
          Состав
        </h2>
        <table className="w-full text-sm">
          <thead className="text-left text-fg-muted">
            <tr>
              <th className="py-0.5 font-medium">Блюдо</th>
              <th className="py-0.5 text-right font-medium">Кол-во</th>
              <th className="py-0.5 text-right font-medium">Сумма</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {order.items.map((i) => (
              <tr key={i.id}>
                <td className="py-1">
                  {i.name}
                  {i.modifiers.length ? <span className="block text-fg-muted">{i.modifiers.map((m) => `${m.name} (+${formatRub(m.price)})`).join(", ")}</span> : null}
                </td>
                <td className="py-1 text-right tabular-nums">{i.quantity}</td>
                <td className="py-1 text-right tabular-nums">{formatRub(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-1 flex flex-col gap-0.5 border-t border-line pt-1 text-sm">
          <div className="flex justify-between">
            <dt>Блюда</dt>
            <dd className="tabular-nums">{formatRub(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Доставка</dt>
            <dd className="tabular-nums">{formatRub(order.deliveryFee)}</dd>
          </div>
          {order.discount ? (
            <div className="flex justify-between">
              <dt>Скидка{order.promoCode ? ` (${order.promoCode.code})` : ""}</dt>
              <dd className="tabular-nums">−{formatRub(order.discount)}</dd>
            </div>
          ) : null}
          {order.bonusSpent ? (
            <div className="flex justify-between">
              <dt>Списано бонусов</dt>
              <dd className="tabular-nums">−{formatRub(order.bonusSpent)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between font-semibold">
            <dt>Итого</dt>
            <dd className="tabular-nums">{formatRub(order.total)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
