import { zonedParts, zonedTimeToUtc } from "@/lib/order/schedule";

/** Периоды аналитики: сегодня (по часам), 7 и 30 дней (по дням) — в часовом поясе ресторана. */
export type AnalyticsPeriod = "day" | "week" | "month";

export const ANALYTICS_PERIODS: { value: AnalyticsPeriod; label: string; compare: string; chart: string }[] = [
  { value: "day", label: "Сегодня", compare: "к этому времени вчера", chart: "по часам" },
  { value: "week", label: "7 дней", compare: "к прошлым 7 дням", chart: "по дням" },
  { value: "month", label: "30 дней", compare: "к прошлым 30 дням", chart: "по дням" },
];

export function parsePeriod(value: unknown): AnalyticsPeriod {
  return value === "week" || value === "month" ? value : "day";
}

export type Bucket = {
  start: Date;
  /** Полная подпись для подсказки и таблицы: «14:00–15:00», «пт, 13 нояб.». */
  label: string;
  /** Короткая подпись под осью; null — без подписи (чтобы не теснить ось). */
  tick: string | null;
  /** Второстепенная подпись: на узком экране скрывается. */
  minor?: boolean;
};

export type PeriodRange = {
  from: Date;
  to: Date;
  /** Тот же отрезок в прошлом периоде: для «сегодня» — вчера до того же часа. */
  prevFrom: Date;
  prevTo: Date;
  buckets: Bucket[];
};

const DAY_COUNT: Record<Exclude<AnalyticsPeriod, "day">, number> = { week: 7, month: 30 };

export function periodRange(period: AnalyticsPeriod, now: Date, timeZone: string): PeriodRange {
  const { year, month, day } = zonedParts(now, timeZone);
  const at = (d: number, h = 0) => zonedTimeToUtc(year, month, day + d, h, 0, timeZone);

  if (period === "day") {
    const from = at(0);
    const to = at(1);
    const prevFrom = at(-1);
    const elapsed = Math.min(now.getTime(), to.getTime()) - from.getTime();
    const hh = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      start: at(0, h),
      label: `${hh(h)}–${hh(h + 1)}`,
      tick: h % 3 === 0 ? hh(h) : null,
      minor: h % 6 !== 0,
    }));
    return { from, to, prevFrom, prevTo: new Date(prevFrom.getTime() + elapsed), buckets };
  }

  const n = DAY_COUNT[period];
  const from = at(-(n - 1));
  const to = at(1);
  const prevFrom = at(-(2 * n - 1));
  const full = new Intl.DateTimeFormat("ru-RU", { timeZone, weekday: "short", day: "numeric", month: "short" });
  const weekday = new Intl.DateTimeFormat("ru-RU", { timeZone, weekday: "short" });
  const date = new Intl.DateTimeFormat("ru-RU", { timeZone, day: "2-digit", month: "2-digit" });
  const buckets = Array.from({ length: n }, (_, i) => {
    const start = at(-(n - 1) + i);
    // Неделя — каждый день («пн»), месяц — каждый пятый день от сегодняшнего («13.11»).
    const tick = period === "week" ? weekday.format(start) : (n - 1 - i) % 5 === 0 ? date.format(start) : null;
    return { start, label: full.format(start), tick };
  });
  return { from, to, prevFrom, prevTo: from, buckets };
}

export type OrderPoint = { createdAt: Date; total: number };
export type BucketValue = Bucket & { revenue: number; orders: number };

/** Раскладывает заказы по корзинам (по времени создания). Заказы вне диапазона не учитываются. */
export function bucketize(orders: readonly OrderPoint[], range: Pick<PeriodRange, "buckets" | "to">): BucketValue[] {
  const values = range.buckets.map((b) => ({ ...b, revenue: 0, orders: 0 }));
  const end = range.to.getTime();
  for (const o of orders) {
    const t = o.createdAt.getTime();
    if (t >= end) continue;
    let idx = -1;
    for (let i = values.length - 1; i >= 0; i--) {
      if (t >= values[i]!.start.getTime()) {
        idx = i;
        break;
      }
    }
    if (idx < 0) continue;
    values[idx]!.revenue += o.total;
    values[idx]!.orders += 1;
  }
  return values;
}

export type Summary = { revenue: number; orders: number; average: number };

/** Средний чек округляем до рубля: копейки в нём только шумят. */
export function summarize(revenue: number, orders: number): Summary {
  return { revenue, orders, average: orders > 0 ? Math.round(revenue / orders / 100) * 100 : 0 };
}

/** Изменение к прошлому периоду, доли единицы. null — сравнивать не с чем. */
export function delta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return (current - previous) / previous;
}

/** «Круглый» верх оси в копейках: 1, 2, 2,5 или 5 × 10ⁿ рублей. */
export function niceMax(kopecks: number): number {
  const rub = kopecks / 100;
  if (rub <= 0) return 100_000; // пустой график: ось до 1 000 ₽
  const pow = 10 ** Math.floor(Math.log10(rub));
  const step = [1, 2, 2.5, 5, 10].find((k) => k * pow >= rub) ?? 10;
  return Math.round(step * pow * 100);
}
