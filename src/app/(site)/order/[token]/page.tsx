import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { Eyebrow } from "@/components/ui/Typography";
import { formatRub } from "@/lib/money";
import { paymentLabels } from "@/lib/order/schemas";
import { db } from "@/server/db";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: "Ваш заказ",
  robots: { index: false, follow: false },
};

const statusLabels = {
  AWAITING_PAYMENT: "Ждём оплату",
  ACCEPTED: "Принят",
  COOKING: "Готовится",
  DELIVERING: "Передан курьеру",
  READY: "Готов к выдаче",
  COMPLETED: "Доставлен",
  CANCELED: "Отменён",
} as const;

async function OrderDetails({ token }: { token: string }) {
  // Токен — 24 случайных байта; короткие и подозрительные значения отсекаем сразу.
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) notFound();
  const order = await db.order.findUnique({
    where: { publicToken: token },
    include: { items: { include: { modifiers: true } }, zone: true },
  });
  if (!order) notFound();
  const settings = await getSettings();
  const when = order.scheduledFor
    ? new Intl.DateTimeFormat("ru-RU", {
        timeZone: settings.timezone,
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }).format(order.scheduledFor)
    : "как можно скорее";
  const status = order.type === "PICKUP" && order.status === "COMPLETED" ? "Выдан" : statusLabels[order.status];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Eyebrow>Заказ №{order.number}</Eyebrow>
        <h1 className="flex items-center gap-1.5 font-display text-h1 text-fg">
          <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
          {status}
        </h1>
        <p className="text-lead text-fg-muted">
          {order.type === "DELIVERY" ? `Доставка: ${order.addressText}` : `Самовывоз: ${settings.addressShort}`}
        </p>
        <p className="flex items-center gap-1 text-base text-fg">
          <Clock className="size-2 text-ginger" aria-hidden="true" />
          {when}
        </p>
        {order.status === "AWAITING_PAYMENT" ? (
          <p className="rounded-field bg-surface-2 px-2 py-1 text-sm text-fg">
            Онлайн-оплата подключается на следующем этапе. Заказ сохранён и ждёт оплаты.
          </p>
        ) : null}
      </div>

      <section aria-labelledby="order-items" className="rounded-card border border-line bg-surface p-2 md:p-3">
        <h2 id="order-items" className="mb-1 text-h3 font-semibold text-fg">
          Состав
        </h2>
        <ul className="flex flex-col divide-y divide-line">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-2 py-1">
              <span>
                <span className="text-base text-fg">
                  {i.name} × {i.quantity}
                </span>
                {i.modifiers.length ? (
                  <span className="block text-sm text-fg-muted">{i.modifiers.map((m) => m.name).join(", ")}</span>
                ) : null}
              </span>
              <span className="text-base text-fg tabular-nums">{formatRub(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-1 flex flex-col gap-0.5 border-t border-line pt-1 text-base">
          <div className="flex justify-between text-fg-muted">
            <dt>Блюда</dt>
            <dd className="tabular-nums">{formatRub(order.subtotal)}</dd>
          </div>
          {order.type === "DELIVERY" ? (
            <div className="flex justify-between text-fg-muted">
              <dt>Доставка</dt>
              <dd className="tabular-nums">{order.deliveryFee ? formatRub(order.deliveryFee) : "бесплатно"}</dd>
            </div>
          ) : null}
          {order.discount ? (
            <div className="flex justify-between text-fg-muted">
              <dt>Скидка</dt>
              <dd className="tabular-nums">−{formatRub(order.discount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between font-semibold text-fg">
            <dt>Итого · {paymentLabels[order.paymentMethod]}</dt>
            <dd className="tabular-nums">{formatRub(order.total)}</dd>
          </div>
        </dl>
      </section>
      <p className="text-sm text-fg-muted">
        Сохраните эту страницу — по ней видно статус заказа. Вопросы:{" "}
        <a className="font-semibold text-fg" href={`tel:${settings.phoneE164}`}>
          {settings.phoneDisplay}
        </a>
      </p>
      <Link href="/menu" className="self-start text-sm font-semibold text-fg underline-offset-4 hover:underline">
        Вернуться в меню
      </Link>
    </div>
  );
}

export default function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <div className="mx-auto max-w-prose px-2 py-4 md:py-8">
      <Suspense fallback={<div className="h-40 animate-pulse rounded-card bg-surface" aria-busy="true" />}>
        {params.then(({ token }) => (
          <OrderDetails token={token} />
        ))}
      </Suspense>
    </div>
  );
}
