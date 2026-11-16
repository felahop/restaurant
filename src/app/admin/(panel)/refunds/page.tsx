import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { RefundDecision } from "@/components/admin/misc/RefundDecision";
import { Badge } from "@/components/ui/Badge";
import { formatRub } from "@/lib/money";
import { paymentLabels } from "@/lib/order/schemas";
import { requireAdmin } from "@/server/admin/auth";
import { listRefunds } from "@/server/admin/refunds";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Возвраты" };
export const instant = false;

const LABELS = {
  REQUESTED: { text: "Ждёт решения", tone: "hit" },
  PENDING: { text: "Обрабатывается", tone: "neutral" },
  SUCCEEDED: { text: "Возвращено", tone: "success" },
  DECLINED: { text: "Без возврата", tone: "soldOut" },
  FAILED: { text: "Сервис отказал", tone: "hit" },
} as const;

export default async function RefundsPage() {
  await requireAdmin("refunds");
  const [rows, { timezone }] = await Promise.all([listRefunds(), getSettings()]);
  const when = new Intl.DateTimeFormat("ru-RU", { timeZone: timezone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="flex max-w-240 flex-col gap-2">
      <AdminPageHeader
        title="Возвраты"
        description="Когда отменяют оплаченный онлайн заказ, сюда приходит заявка. Решите: вернуть деньги через платёжный сервис или нет (с причиной)."
      />
      {rows.length === 0 ? <p className="rounded-card border border-line bg-surface p-3 text-center text-fg-muted">Заявок на возврат нет.</p> : null}
      <ul className="flex flex-col gap-1" aria-label="Заявки на возврат">
        {rows.map((r) => {
          const label = LABELS[r.refundStatus!];
          const open = r.refundStatus === "REQUESTED" || r.refundStatus === "FAILED";
          return (
            <li key={r.id} className="flex flex-col gap-1 rounded-card border border-line bg-surface p-2">
              <div className="flex flex-wrap items-center gap-1">
                <Link href={`/admin/orders/${r.id}`} className="text-title font-semibold text-fg hover:underline">
                  №{r.number}
                </Link>
                <Badge tone={label.tone}>{label.text}</Badge>
                <span className="ml-auto font-semibold tabular-nums">{formatRub(r.total)}</span>
              </div>
              <p className="text-sm text-fg-muted">
                {paymentLabels[r.paymentMethod]}
                {r.paidAt ? `, оплачен ${when.format(r.paidAt)}` : ""}
                {r.canceledAt ? ` · отменён ${when.format(r.canceledAt)}` : ""}
              </p>
              {r.cancelReason ? <p className="text-sm text-fg">Причина отмены: {r.cancelReason}</p> : null}
              {r.refundNote ? <p className="text-sm text-fg">{r.refundStatus === "DECLINED" ? "Без возврата: " : ""}{r.refundNote}</p> : null}
              {r.refundDecidedBy && !open ? (
                <p className="text-xs text-fg-muted">
                  Решение: {r.refundDecidedBy}
                  {r.refundDecidedAt ? `, ${when.format(r.refundDecidedAt)}` : ""}
                </p>
              ) : null}
              {open ? <RefundDecision orderId={r.id} number={r.number} amountLabel={formatRub(r.total)} /> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
