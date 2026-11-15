"use client";

import { useEffect, useState } from "react";
import { Check, CircleAlert, CreditCard, LoaderCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Typography";
import { cn } from "@/lib/cn";

type Status = "AWAITING_PAYMENT" | "ACCEPTED" | "COOKING" | "DELIVERING" | "READY" | "COMPLETED" | "CANCELED";

export type LiveOrder = {
  number: number;
  type: "DELIVERY" | "PICKUP";
  status: Status;
  paymentMethod: "CARD_ONLINE" | "SBP" | "CARD_ON_DELIVERY" | "CASH";
  paymentStatus: "PENDING" | "SUCCEEDED" | "CANCELED" | "REFUNDED" | "NOT_REQUIRED";
  cancelReason: string | null;
  acceptedAt: string | null;
  cookingAt: string | null;
  deliveringAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
};

const POLL_MS = 5000;

function steps(type: LiveOrder["type"]) {
  return type === "DELIVERY"
    ? ([
        ["ACCEPTED", "Принят", "acceptedAt"],
        ["COOKING", "Готовится", "cookingAt"],
        ["DELIVERING", "Передан курьеру", "deliveringAt"],
        ["COMPLETED", "Доставлен", "completedAt"],
      ] as const)
    : ([
        ["ACCEPTED", "Принят", "acceptedAt"],
        ["COOKING", "Готовится", "cookingAt"],
        ["READY", "Готов к выдаче", "readyAt"],
        ["COMPLETED", "Выдан", "completedAt"],
      ] as const);
}

function headline(o: LiveOrder): string {
  if (o.status === "CANCELED") return "Заказ отменён";
  if (o.status === "AWAITING_PAYMENT") return o.paymentStatus === "CANCELED" ? "Оплата не прошла" : "Ждём оплату";
  return steps(o.type).find(([s]) => s === o.status)?.[1] ?? "Принят";
}

export function OrderStatusLive({ token, initial, timeZone }: { token: string; initial: LiveOrder; timeZone: string }) {
  const [order, setOrder] = useState(initial);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const final = order.status === "COMPLETED" || order.status === "CANCELED";

  // Страница обновляется сама: опрашиваем статус, пока заказ не завершён и вкладка видна.
  useEffect(() => {
    if (final) return;
    let stopped = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/orders/${token}/status`, { cache: "no-store" });
        if (res.ok && !stopped) setOrder((await res.json()) as LiveOrder);
      } catch {
        // временно нет сети — попробуем в следующий раз
      }
    };
    const id = window.setInterval(tick, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [token, final]);

  const pay = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const res = await fetch(`/api/orders/${token}/pay`, { method: "POST" });
      const body = (await res.json()) as { confirmationUrl?: string; error?: string };
      if (!res.ok || !body.confirmationUrl) throw new Error(body.error ?? "Не получилось перейти к оплате");
      window.location.assign(body.confirmationUrl);
    } catch (e) {
      setPayError((e as Error).message);
      setPaying(false);
    }
  };

  const time = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat("ru-RU", { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(iso))
      : null;
  const list = steps(order.type);
  const currentIndex = list.findIndex(([s]) => s === order.status);
  const paidOnline = order.paymentStatus === "SUCCEEDED";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Eyebrow>Заказ №{order.number}</Eyebrow>
        <h1 className="font-display text-h1 text-fg" aria-live="polite">
          {headline(order)}
        </h1>
        <div className="flex flex-wrap gap-1">
          {paidOnline ? <Badge tone="success">Оплачен онлайн</Badge> : null}
          {!final && order.status !== "AWAITING_PAYMENT" ? (
            <span className="inline-flex items-center gap-1 text-sm text-fg-muted">
              <LoaderCircle className="size-2 animate-spin" aria-hidden="true" />
              Статус обновляется сам
            </span>
          ) : null}
        </div>
      </div>

      {order.status === "AWAITING_PAYMENT" ? (
        <div
          className={cn(
            "flex flex-col gap-1.5 rounded-card border p-2",
            order.paymentStatus === "CANCELED" ? "border-cinnabar" : "border-line bg-surface",
          )}
          role={order.paymentStatus === "CANCELED" ? "alert" : "status"}
        >
          {order.paymentStatus === "CANCELED" ? (
            <>
              <p className="flex items-center gap-1 text-base font-semibold text-fg">
                <CircleAlert className="size-2.5 text-accent" aria-hidden="true" />
                Деньги не списаны
              </p>
              <p className="text-sm text-fg-muted">
                Проверьте карту или выберите СБП в платёжном сервисе — заказ мы сохранили.
              </p>
            </>
          ) : (
            <p className="flex items-center gap-1 text-sm text-fg">
              <LoaderCircle className="size-2 animate-spin text-ginger" aria-hidden="true" />
              Как только платёжный сервис подтвердит оплату, заказ уйдёт на кухню. Обычно это секунды.
            </p>
          )}
          <Button
            onClick={pay}
            loading={paying}
            icon={<CreditCard className="size-2.5" aria-hidden="true" />}
            className="self-start"
          >
            {order.paymentStatus === "CANCELED" ? "Попробовать ещё раз" : "Перейти к оплате"}
          </Button>
          {payError ? (
            <p className="text-sm text-accent" role="alert">
              {payError}
            </p>
          ) : null}
        </div>
      ) : null}

      {order.status === "CANCELED" ? (
        <p
          className="flex items-start gap-1 rounded-card border border-line bg-surface p-2 text-base text-fg"
          role="status"
        >
          <XCircle className="mt-0.5 size-2.5 shrink-0 text-accent" aria-hidden="true" />
          {order.cancelReason ?? "Если это ошибка, позвоните нам — разберёмся."}
        </p>
      ) : null}

      {order.status !== "AWAITING_PAYMENT" && order.status !== "CANCELED" ? (
        <ol className="flex flex-col" aria-label="Этапы заказа">
          {list.map(([status, label, field], i) => {
            const done = i <= currentIndex;
            const current = i === currentIndex;
            return (
              <li key={status} className="flex gap-1.5" aria-current={current ? "step" : undefined}>
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "inline-flex size-3 items-center justify-center rounded-full border-2",
                      done ? "border-matcha bg-matcha text-ink" : "border-line-strong text-fg-muted",
                    )}
                  >
                    {done ? <Check className="size-1.5" strokeWidth={3} aria-hidden="true" /> : null}
                  </span>
                  {i < list.length - 1 ? (
                    <span className={cn("w-px flex-1", done ? "bg-matcha" : "bg-line")} aria-hidden="true" />
                  ) : null}
                </div>
                <div className="flex flex-1 items-baseline justify-between gap-1 pb-2">
                  <span
                    className={cn("text-base", current ? "font-semibold text-fg" : done ? "text-fg" : "text-fg-muted")}
                  >
                    {label}
                  </span>
                  <span className="text-sm text-fg-muted tabular-nums">{time(order[field])}</span>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}
