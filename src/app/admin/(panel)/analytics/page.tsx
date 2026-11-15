import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { KpiTiles } from "@/components/admin/analytics/KpiTiles";
import { RevenueChart } from "@/components/admin/analytics/RevenueChart";
import { TopDishes } from "@/components/admin/analytics/TopDishes";
import { ANALYTICS_PERIODS, parsePeriod } from "@/lib/admin/analytics";
import { cn } from "@/lib/cn";
import { getAnalytics } from "@/server/admin/analytics";
import { requireAdmin } from "@/server/admin/auth";

export const metadata: Metadata = { title: "Аналитика" };
export const instant = false;

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requireAdmin("analytics");
  const period = parsePeriod((await searchParams).period);
  const meta = ANALYTICS_PERIODS.find((p) => p.value === period)!;
  const data = await getAnalytics(period);

  return (
    <div className="flex max-w-240 flex-col gap-2">
      <AdminPageHeader
        title="Аналитика"
        description="Считаем принятые заказы: отменённые и неоплаченные онлайн не входят. Время — по часовому поясу ресторана."
      />
      <nav aria-label="Период" className="flex gap-0.5 border-b border-line">
        {ANALYTICS_PERIODS.map((p) => (
          <Link
            key={p.value}
            href={p.value === "day" ? "/admin/analytics" : `/admin/analytics?period=${p.value}`}
            aria-current={p.value === period ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex min-h-5.5 items-center border-b-2 px-1.5 text-sm font-semibold",
              p.value === period ? "border-ink text-fg" : "border-transparent text-fg-muted hover:text-fg",
            )}
          >
            {p.label}
          </Link>
        ))}
      </nav>
      <KpiTiles summary={data.summary} deltas={data.deltas} compare={meta.compare} />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
        <span className="text-fg-muted">Скачать CSV за период «{meta.label}»:</span>
        {(
          [
            ["orders", "заказы"],
            ["revenue", "выручка"],
            ["dishes", "блюда"],
          ] as const
        ).map(([kind, label]) => (
          <a
            key={kind}
            href={`/api/admin/export/${kind}?period=${period}`}
            download
            className="inline-flex min-h-5.5 items-center gap-0.5 font-semibold text-fg underline-offset-4 hover:underline"
          >
            <Download className="size-2" aria-hidden="true" />
            {label}
          </a>
        ))}
      </div>
      <RevenueChart
        title={`Выручка ${meta.chart}`}
        bars={data.series.map(({ label, tick, minor, revenue, orders }) => ({ label, tick, minor, revenue, orders }))}
      />
      <TopDishes rows={data.topDishes} />
    </div>
  );
}
