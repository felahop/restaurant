"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { BellOff, BellRing, CalendarDays, Clock, Mail, Store, Truck, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatRub } from "@/lib/money";
import { alertAt, isOrderDue } from "@/lib/order/preorder";
import { paymentLabels } from "@/lib/order/schemas";
import { nextStatus, statusLabel, type OrderStatusValue, type OrderTypeValue } from "@/lib/order/status";
import { setOrderStatusAction } from "@/app/admin/(panel)/orders/actions";

type FeedOrder = {
  id: string;
  number: number;
  type: OrderTypeValue;
  status: OrderStatusValue;
  paymentMethod: keyof typeof paymentLabels;
  paymentStatus: string;
  total: number;
  scheduledFor: string | null;
  createdAt: string;
  comment: string | null;
  cutlery: number;
  addressText: string | null;
  items: { name: string; quantity: number; modifiers: { name: string }[] }[];
};

type Filter = "active" | "upcoming" | "awaiting" | "done" | "canceled" | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "active", label: "В работе" },
  { value: "upcoming", label: "Предзаказы" },
  { value: "awaiting", label: "Ждут оплату" },
  { value: "done", label: "Завершённые" },
  { value: "canceled", label: "Отменённые" },
  { value: "all", label: "Все" },
];

const POLL_MS = 5000;

type Alerts = { reservations: string[] | null; messages: string[] | null; refunds: string[] | null };
type AlertKind = keyof Alerts;

const ALERTS: { kind: AlertKind; href: string; label: string; Icon: typeof Mail }[] = [
  { kind: "reservations", href: "/admin/reservations", label: "Новые брони", Icon: CalendarDays },
  { kind: "messages", href: "/admin/messages", label: "Сообщения", Icon: Mail },
  { kind: "refunds", href: "/admin/refunds", label: "Возвраты ждут решения", Icon: Undo2 },
];

/** Мягкий одиночный сигнал — брони, сообщения, возвраты (отличается от двойного сигнала заказа). */
function chime(ctx: AudioContext) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(660, now);
  osc.frequency.exponentialRampToValueAtTime(990, now + 0.25);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.5);
}

/** Короткий двойной сигнал через Web Audio — без файлов. */
function beep(ctx: AudioContext) {
  const now = ctx.currentTime;
  [0, 0.22].forEach((offset, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = i === 0 ? 880 : 1175;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.3, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.2);
  });
}

export function OrdersFeed({ timeZone, initialDate }: { timeZone: string; initialDate: string }) {
  const [date, setDate] = useState(initialDate);
  const [filter, setFilter] = useState<Filter>("active");
  const [orders, setOrders] = useState<FeedOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [soundOn, setSoundOn] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [alertMinutes, setAlertMinutes] = useState(120);
  const [alerts, setAlerts] = useState<Alerts>({ reservations: null, messages: null, refunds: null });
  const [freshAlerts, setFreshAlerts] = useState<Set<AlertKind>>(new Set());
  const seenAlerts = useRef<Record<AlertKind, Set<string>> | null>(null);
  /** Заказы, о которых уже просигналили (или которые были в ленте при открытии). */
  const alerted = useRef<Set<string> | null>(null);
  const audio = useRef<AudioContext | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/orders?date=${date}&filter=${filter}`, { cache: "no-store" });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = (await res.json()) as { orders: FeedOrder[]; alertMinutes: number; alerts: Alerts };
      setOrders(data.orders);
      setAlertMinutes(data.alertMinutes);
      setAlerts(data.alerts);
      setError(null);
      // Брони, сообщения, возвраты: сигнал, когда появилось что-то новое с момента открытия ленты.
      const kinds = Object.keys(data.alerts) as AlertKind[];
      if (seenAlerts.current) {
        const added = kinds.filter((k) => (data.alerts[k] ?? []).some((id) => !seenAlerts.current![k].has(id)));
        if (added.length) {
          setFreshAlerts((prev) => new Set([...prev, ...added]));
          if (audio.current) chime(audio.current);
        }
      }
      seenAlerts.current = Object.fromEntries(
        kinds.map((k) => [k, new Set([...(seenAlerts.current?.[k] ?? []), ...(data.alerts[k] ?? [])])]),
      ) as Record<AlertKind, Set<string>>;
      // Сигнал и подсветка: новый заказ «как можно скорее» — сразу, предзаказ — когда до него осталось alertMinutes.
      const now = new Date();
      const due = data.orders.filter((o) => o.status === "ACCEPTED" && isOrderDue(o, data.alertMinutes, now)).map((o) => o.id);
      if (alerted.current) {
        const added = due.filter((id) => !alerted.current!.has(id));
        if (added.length) {
          setFresh((prev) => new Set([...prev, ...added]));
          if (audio.current) beep(audio.current);
          window.setTimeout(() => setFresh((prev) => new Set([...prev].filter((id) => !added.includes(id)))), 15_000);
        }
      }
      alerted.current = new Set([...(alerted.current ?? []), ...due]);
    } catch {
      setError("Нет связи с сервером. Повторим через несколько секунд.");
    }
  }, [date, filter, router]);

  useEffect(() => {
    alerted.current = null;
    const first = window.setTimeout(load, 0);
    const id = window.setInterval(load, POLL_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [load]);

  const toggleSound = () => {
    if (soundOn) {
      setSoundOn(false);
      void audio.current?.close();
      audio.current = null;
      return;
    }
    const ctx = new AudioContext();
    audio.current = ctx;
    beep(ctx);
    setSoundOn(true);
  };

  const advance = (o: FeedOrder, to: OrderStatusValue) =>
    startTransition(async () => {
      const res = await setOrderStatusAction(o.id, to);
      setMessage(res.ok ? (res.message ?? null) : res.error);
      await load();
    });

  const time = (iso: string | Date) =>
    new Intl.DateTimeFormat("ru-RU", { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const dayTime = (iso: string) =>
    new Intl.DateTimeFormat("ru-RU", { timeZone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-1.5">
        <label className="flex flex-col gap-0.5 text-sm font-medium text-fg">
          Дата
          <input
            type="date"
            value={date}
            disabled={filter === "upcoming"}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="h-5.5 rounded-field border border-line-strong bg-surface px-1.5 text-base text-fg disabled:opacity-50"
          />
        </label>
        <div role="group" aria-label="Статус" className="scrollbar-none flex gap-0.5 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "h-5.5 shrink-0 rounded-full border px-1.5 text-sm font-semibold",
                filter === f.value ? "border-ink bg-ink text-paper" : "border-line-strong text-fg hover:border-ink",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button
          variant={soundOn ? "secondary" : "primary"}
          size="sm"
          onClick={toggleSound}
          icon={soundOn ? <BellRing className="size-2" aria-hidden="true" /> : <BellOff className="size-2" aria-hidden="true" />}
          className="ml-auto"
        >
          {soundOn ? "Звук включён" : "Включить звук"}
        </Button>
      </div>

      {ALERTS.some((a) => alerts[a.kind]?.length) ? (
        <ul className="flex flex-wrap gap-1" aria-label="Требуют внимания">
          {ALERTS.filter((a) => alerts[a.kind]?.length).map(({ kind, href, label, Icon }) => (
            <li key={kind}>
              <Link
                href={href}
                onClick={() => setFreshAlerts((prev) => new Set([...prev].filter((k) => k !== kind)))}
                className={cn(
                  "inline-flex min-h-5.5 items-center gap-1 rounded-full border px-1.5 text-sm font-semibold text-fg transition-colors duration-150 hover:bg-surface-2",
                  freshAlerts.has(kind) ? "border-ginger-deep bg-surface shadow-soft" : "border-line-strong",
                )}
              >
                <Icon className="size-2" aria-hidden="true" />
                {label}: {alerts[kind]!.length}
                {freshAlerts.has(kind) ? <Badge tone="hit">Новое</Badge> : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <p role="status" aria-live="polite" className="min-h-2.5 text-sm text-fg-muted">
        {error ??
          message ??
          (orders
            ? filter === "upcoming"
              ? `Предзаказов: ${orders.length} на все даты. Сигнал прозвучит за ${alertMinutes} мин до времени заказа.`
              : `Заказов: ${orders.length}. Лента обновляется каждые 5 секунд.`
            : "Загружаем…")}
      </p>

      {orders && orders.length === 0 ? (
        <p className="rounded-card border border-line bg-surface p-3 text-center text-base text-fg-muted">
          Здесь пока пусто. Новые заказы появятся сами.
        </p>
      ) : null}

      <ul className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-3" aria-label="Заказы">
        {orders?.map((o) => {
          const next = nextStatus(o.status, o.type);
          const unpaid = o.status === "AWAITING_PAYMENT";
          const waiting = o.scheduledFor && o.status === "ACCEPTED" && !isOrderDue(o, alertMinutes);
          return (
            <li
              key={o.id}
              className={cn(
                "flex flex-col gap-1 rounded-card border bg-surface p-2 transition-colors duration-250",
                fresh.has(o.id) ? "border-ginger-deep shadow-soft" : "border-line",
                (o.status === "CANCELED" || unpaid) && "opacity-70",
              )}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex flex-col">
                  <Link href={`/admin/orders/${o.id}`} className="text-title font-semibold text-fg hover:underline">
                    №{o.number}
                  </Link>
                  <span className="text-xs text-fg-muted">принят в {time(o.createdAt)}</span>
                </div>
                <div className="flex flex-wrap justify-end gap-0.5">
                  {o.scheduledFor && o.status === "ACCEPTED" && !waiting ? (
                    <Badge tone="hit">Пора готовить</Badge>
                  ) : fresh.has(o.id) ? (
                    <Badge tone="hit">Новый</Badge>
                  ) : null}
                  {waiting ? <Badge tone="neutral">Предзаказ</Badge> : null}
                  <Badge tone={o.status === "COMPLETED" ? "success" : o.status === "CANCELED" ? "soldOut" : "neutral"}>
                    {statusLabel(o.status, o.type)}
                  </Badge>
                </div>
              </div>
              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-fg">
                <span className="inline-flex items-center gap-0.5">
                  {o.type === "DELIVERY" ? <Truck className="size-2" aria-hidden="true" /> : <Store className="size-2" aria-hidden="true" />}
                  {o.type === "DELIVERY" ? "Доставка" : "Самовывоз"}
                </span>
                <span className="inline-flex items-center gap-0.5 font-semibold">
                  <Clock className="size-2" aria-hidden="true" />
                  {o.scheduledFor ? `к ${filter === "upcoming" ? dayTime(o.scheduledFor) : time(o.scheduledFor)}` : "сразу"}
                </span>
                {waiting && o.scheduledFor ? (
                  <span className="text-fg-muted">сигнал в {time(alertAt(o.scheduledFor, alertMinutes))}</span>
                ) : null}
              </p>
              <ul className="flex flex-col text-sm text-fg">
                {o.items.map((i, idx) => (
                  <li key={idx}>
                    <b className="font-semibold">{i.quantity}×</b> {i.name}
                    {i.modifiers.length ? <span className="text-fg-muted"> ({i.modifiers.map((m) => m.name).join(", ")})</span> : null}
                  </li>
                ))}
              </ul>
              {o.comment ? <p className="rounded-sm bg-surface-2 px-1 py-0.5 text-sm text-fg">💬 {o.comment}</p> : null}
              <p className="flex items-center justify-between gap-1 text-sm">
                <span className="text-fg-muted">
                  {paymentLabels[o.paymentMethod]}
                  {o.paymentStatus === "SUCCEEDED" ? " · оплачен" : ""}
                  {o.cutlery ? ` · приборов: ${o.cutlery}` : ""}
                </span>
                <span className="font-semibold text-fg tabular-nums">{formatRub(o.total)}</span>
              </p>
              <div className="mt-auto flex gap-1 pt-0.5">
                {next ? (
                  <Button size="sm" className="flex-1" disabled={pending} onClick={() => advance(o, next)}>
                    {statusLabel(next, o.type)} →
                  </Button>
                ) : null}
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="inline-flex h-5.5 items-center rounded-full border-2 border-fg px-2 text-sm font-semibold text-fg hover:bg-fg hover:text-canvas"
                >
                  Открыть
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
