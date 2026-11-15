import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatRub } from "@/lib/money";
import type { Summary } from "@/lib/admin/analytics";

type Deltas = Record<keyof Summary, number | null>;

const percent = new Intl.NumberFormat("ru-RU", { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" });

function DeltaLine({ value, compare }: { value: number | null; compare: string }) {
  if (value === null) return <span className="text-sm text-fg-muted">Не с чем сравнить</span>;
  const rounded = Math.round(value * 100) / 100;
  const Icon = rounded > 0 ? ArrowUpRight : rounded < 0 ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-center gap-0.5 text-sm text-fg-muted">
      <Icon className="size-2 shrink-0 text-fg" aria-hidden="true" />
      <span>
        <span className="font-semibold text-fg tabular-nums">{percent.format(rounded)}</span> {compare}
      </span>
    </span>
  );
}

/** Ключевые показатели периода: значение крупно, ниже — изменение к прошлому периоду. */
export function KpiTiles({ summary, deltas, compare }: { summary: Summary; deltas: Deltas; compare: string }) {
  const tiles = [
    { key: "revenue", label: "Выручка", value: formatRub(summary.revenue) },
    { key: "orders", label: "Заказов", value: String(summary.orders) },
    { key: "average", label: "Средний чек", value: summary.orders ? formatRub(summary.average) : "—" },
  ] as const;
  return (
    <dl className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
      {tiles.map((t) => (
        <div
          key={t.key}
          className="flex flex-col gap-0.5 rounded-card border border-line bg-surface p-2 first:col-span-2 sm:first:col-span-1"
        >
          <dt className="text-sm font-medium text-fg-muted">{t.label}</dt>
          <dd className="font-display text-h3 text-fg tabular-nums">{t.value}</dd>
          <dd>
            <DeltaLine value={deltas[t.key]} compare={compare} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
