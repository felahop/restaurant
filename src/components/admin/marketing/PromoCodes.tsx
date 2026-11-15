"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/Choice";
import { TextField } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { formatRub } from "@/lib/money";
import { deletePromoCodeAction, savePromoCodeAction } from "@/app/admin/(panel)/marketing/actions";

export type PromoRow = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minOrder: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
};

const toInputDate = (iso: string | null) => (iso ? iso.slice(0, 16) : "");

function PromoForm({ row, onDone }: { row: PromoRow | null; onDone: () => void }) {
  const [v, setV] = useState({
    code: row?.code ?? "",
    type: row?.type ?? ("PERCENT" as "PERCENT" | "FIXED"),
    value: row ? String(row.type === "PERCENT" ? row.value : row.value / 100) : "10",
    minOrder: row?.minOrder != null ? String(row.minOrder / 100) : "",
    startsAt: toInputDate(row?.startsAt ?? null),
    endsAt: toInputDate(row?.endsAt ?? null),
    usageLimit: row?.usageLimit != null ? String(row.usageLimit) : "",
    isActive: row?.isActive ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const n = (s: string) => (s.trim() ? Number(s.replace(",", ".")) : null);
  const prefix = row?.id ?? "new-promo";
  return (
    <form
      className="grid gap-1.5 rounded-card border border-line bg-surface p-2 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await savePromoCodeAction(row?.id ?? null, {
            code: v.code,
            type: v.type,
            value: n(v.value) ?? 0,
            minOrder: n(v.minOrder),
            startsAt: v.startsAt ? new Date(v.startsAt).toISOString() : null,
            endsAt: v.endsAt ? new Date(v.endsAt).toISOString() : null,
            usageLimit: n(v.usageLimit),
            isActive: v.isActive,
          });
          if (res.ok) onDone();
          else setError(res.error);
        });
      }}
    >
      <TextField id={`${prefix}-code`} label="Код" value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })} />
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Тип скидки</span>
        <SegmentedControl name={`${prefix}-type`} legend="Тип скидки" value={v.type} onChange={(t) => setV({ ...v, type: t })} options={[{ value: "PERCENT", label: "Процент" }, { value: "FIXED", label: "Сумма, ₽" }]} />
      </div>
      <TextField id={`${prefix}-value`} label={v.type === "PERCENT" ? "Скидка, %" : "Скидка, ₽"} inputMode="decimal" value={v.value} onChange={(e) => setV({ ...v, value: e.target.value })} />
      <TextField id={`${prefix}-min`} label="От суммы, ₽" optional inputMode="decimal" value={v.minOrder} onChange={(e) => setV({ ...v, minOrder: e.target.value })} />
      <TextField id={`${prefix}-from`} type="datetime-local" label="Действует с" optional value={v.startsAt} onChange={(e) => setV({ ...v, startsAt: e.target.value })} />
      <TextField id={`${prefix}-to`} type="datetime-local" label="Действует до" optional value={v.endsAt} onChange={(e) => setV({ ...v, endsAt: e.target.value })} />
      <TextField id={`${prefix}-limit`} label="Лимит использований" optional inputMode="numeric" value={v.usageLimit} onChange={(e) => setV({ ...v, usageLimit: e.target.value })} />
      <div className="flex items-end gap-1">
        <Switch checked={v.isActive} onCheckedChange={(c) => setV({ ...v, isActive: c })} label={v.isActive ? "Включён" : "Выключен"} />
      </div>
      <div className="flex flex-wrap items-center gap-1 sm:col-span-2 lg:col-span-4">
        {error ? (
          <p role="alert" className="text-sm text-accent">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="sm" loading={pending} className="ml-auto">
          Сохранить промокод
        </Button>
      </div>
    </form>
  );
}

export function PromoCodes({ rows }: { rows: PromoRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [, start] = useTransition();
  const done = () => {
    setEditing(null);
    router.refresh();
  };
  const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("ru-RU") : "—");
  return (
    <section className="flex flex-col gap-1.5" aria-labelledby="promo-title">
      <div className="flex items-center justify-between">
        <h2 id="promo-title" className="text-title font-semibold">
          Промокоды
        </h2>
        <Button size="sm" variant="secondary" icon={<Plus className="size-2" aria-hidden="true" />} onClick={() => setEditing("new")}>
          Новый промокод
        </Button>
      </div>
      {message ? <p role="status" className="text-sm text-fg-muted">{message}</p> : null}
      {editing === "new" ? <PromoForm row={null} onDone={done} /> : null}
      <div className="overflow-x-auto rounded-card border border-line bg-surface">
        <table className="w-full min-w-90 text-left text-sm">
          <thead className="border-b border-line text-fg-muted">
            <tr>
              <th className="px-1.5 py-1 font-medium">Код</th>
              <th className="px-1.5 py-1 font-medium">Скидка</th>
              <th className="px-1.5 py-1 font-medium">От суммы</th>
              <th className="px-1.5 py-1 font-medium">Срок</th>
              <th className="px-1.5 py-1 font-medium">Использован</th>
              <th className="px-1.5 py-1 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) =>
              editing === r.id ? (
                <tr key={r.id}>
                  <td colSpan={6} className="p-1">
                    <PromoForm row={r} onDone={done} />
                  </td>
                </tr>
              ) : (
                <tr key={r.id}>
                  <td className="px-1.5 py-1 font-semibold">
                    {r.code} {r.isActive ? null : <Badge tone="soldOut">выключен</Badge>}
                  </td>
                  <td className="px-1.5 py-1">{r.type === "PERCENT" ? `${r.value} %` : formatRub(r.value)}</td>
                  <td className="px-1.5 py-1">{r.minOrder ? formatRub(r.minOrder) : "—"}</td>
                  <td className="px-1.5 py-1">
                    {fmtDate(r.startsAt)} — {fmtDate(r.endsAt)}
                  </td>
                  <td className="px-1.5 py-1 tabular-nums">
                    {r.usedCount}
                    {r.usageLimit ? ` из ${r.usageLimit}` : ""}
                  </td>
                  <td className="px-1.5 py-1 text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r.id)}>
                      Изменить
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        window.confirm(`Удалить промокод ${r.code}?`) &&
                        start(async () => {
                          const res = await deletePromoCodeAction(r.id);
                          setMessage(res.ok ? (res.message ?? null) : res.error);
                          router.refresh();
                        })
                      }
                    >
                      Удалить
                    </Button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
