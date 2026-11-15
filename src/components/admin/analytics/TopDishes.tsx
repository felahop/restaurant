import { formatRub } from "@/lib/money";

type Row = { name: string; quantity: number; revenue: number };

/** Популярные блюда: ранжированные горизонтальные столбцы по числу порций, значения подписаны. */
export function TopDishes({ rows }: { rows: Row[] }) {
  const max = Math.max(1, ...rows.map((r) => r.quantity));
  return (
    <section aria-labelledby="top-dishes" className="flex flex-col gap-2 rounded-card border border-line bg-surface p-2 md:p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <h2 id="top-dishes" className="text-title font-semibold text-fg">
          Популярные блюда
        </h2>
        <span className="text-sm text-fg-muted">по числу порций</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-fg-muted">За этот период блюд не заказывали.</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {rows.map((r, i) => (
            <li key={r.name} className="flex flex-col gap-0.5">
              <div className="flex items-baseline gap-1 text-sm">
                <span className="w-2 shrink-0 text-right text-fg-muted tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1 font-medium text-fg">{r.name}</span>
                <span className="shrink-0 text-fg tabular-nums">
                  <span className="font-semibold">{r.quantity} шт.</span>
                  <span className="text-fg-muted"> · {formatRub(r.revenue)}</span>
                </span>
              </div>
              <div className="ml-3 h-1 rounded-r-2xs" aria-hidden="true">
                <div className="h-full rounded-r-2xs bg-ginger-deep" style={{ width: `${(r.quantity / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
