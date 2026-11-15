"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatRub, plural } from "@/lib/money";
import { niceMax } from "@/lib/admin/analytics";

export type ChartBar = { label: string; tick: string | null; minor?: boolean; revenue: number; orders: number };

const compact = new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 });
const ORDER_FORMS = ["заказ", "заказа", "заказов"] as const;

/**
 * Выручка по часам или дням: одна серия столбцов (без легенды — её называет заголовок),
 * подсказка при наведении или касании, тот же ряд таблицей под графиком.
 */
export function RevenueChart({ title, bars }: { title: string; bars: ChartBar[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...bars.map((b) => b.revenue)));
  const ticks = [max, max / 2, 0];
  const n = bars.length;
  const total = bars.reduce((s, b) => s + b.revenue, 0);
  const peak = bars.reduce<ChartBar | null>((best, b) => (b.revenue > (best?.revenue ?? 0) ? b : best), null);
  const shown = active === null ? null : bars[active];

  const summary =
    total > 0 && peak
      ? `${title}: всего ${formatRub(total)}, больше всего — ${peak.label}, ${formatRub(peak.revenue)}.`
      : `${title}: заказов за период нет.`;

  return (
    <figure className="flex flex-col gap-2 rounded-card border border-line bg-surface p-2 md:p-3">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-1">
        <h2 className="text-title font-semibold text-fg">{title}</h2>
        <span className="text-sm text-fg-muted">₽, без отменённых</span>
      </figcaption>

      <div className="flex gap-1">
        {/* Ось значений: подписи на уровне линий сетки. */}
        <div className="relative h-30 w-6 shrink-0 text-right text-2xs text-fg-muted" aria-hidden="true">
          {ticks.map((t, i) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(i / 2) * 100}%` }}>
              {compact.format(t / 100)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div
            role="img"
            aria-label={summary}
            className="relative flex h-30 items-stretch gap-0.25 border-b border-line-strong"
            onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
          >
            {/* Сетка: приглушённая, под столбцами. */}
            {[0, 50].map((top) => (
              <span
                key={top}
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 border-t border-line"
                style={{ top: `${top}%` }}
              />
            ))}
            {bars.map((b, i) => (
              <div
                key={b.label}
                className={cn(
                  "relative flex flex-1 items-end justify-center rounded-t-2xs transition-colors duration-150",
                  active === i && "bg-surface-2",
                )}
                onPointerEnter={() => setActive(i)}
                onPointerDown={() => setActive(i)}
              >
                {b.revenue > 0 ? (
                  <span
                    className="block w-full max-w-3 rounded-t-2xs bg-ginger-deep"
                    style={{ height: `max(2px, ${(b.revenue / max) * 100}%)` }}
                  />
                ) : null}
              </div>
            ))}
          </div>

          {total === 0 ? (
            <p className="pointer-events-none absolute inset-x-0 top-12 text-center text-sm text-fg-muted">
              За этот период заказов нет
            </p>
          ) : null}

          {shown && active !== null ? (
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute top-0 z-10 flex min-w-16 flex-col rounded-sm border border-line-strong bg-surface px-1.5 py-1 shadow-soft",
                active < n * 0.25 ? "" : active > n * 0.75 ? "-translate-x-full" : "-translate-x-1/2",
              )}
              style={{
                left:
                  active < n * 0.25
                    ? `${(active / n) * 100}%`
                    : active > n * 0.75
                      ? `${((active + 1) / n) * 100}%`
                      : `${((active + 0.5) / n) * 100}%`,
              }}
            >
              <span className="text-2xs text-fg-muted">{shown.label}</span>
              <span className="text-base font-semibold text-fg">{formatRub(shown.revenue)}</span>
              <span className="text-2xs text-fg-muted">
                {shown.orders} {plural(shown.orders, ORDER_FORMS)}
              </span>
            </div>
          ) : null}

          <div className="mt-0.5 flex gap-0.25 text-2xs text-fg-muted" aria-hidden="true">
            {bars.map((b) => (
              <span key={b.label} className="relative h-2 flex-1">
                {b.tick ? (
                  <span
                    className={cn("absolute left-1/2 -translate-x-1/2 whitespace-nowrap", b.minor && "max-sm:hidden")}
                  >
                    {b.tick}
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      </div>

      <details className="group text-sm">
        <summary className="inline-flex min-h-5.5 cursor-pointer items-center font-semibold text-fg underline-offset-4 hover:underline">
          Показать таблицей
        </summary>
        <div className="max-h-40 overflow-y-auto">
          <table className="w-full text-left">
            <caption className="sr-only">{title}</caption>
            <thead className="text-fg-muted">
              <tr>
                <th scope="col" className="py-0.5 font-medium">
                  Период
                </th>
                <th scope="col" className="py-0.5 text-right font-medium">
                  Заказов
                </th>
                <th scope="col" className="py-0.5 text-right font-medium">
                  Выручка
                </th>
              </tr>
            </thead>
            <tbody>
              {bars.map((b) => (
                <tr key={b.label} className="border-t border-line">
                  <th scope="row" className="py-0.5 font-regular">
                    {b.label}
                  </th>
                  <td className="py-0.5 text-right tabular-nums">{b.orders}</td>
                  <td className="py-0.5 text-right tabular-nums">{formatRub(b.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
