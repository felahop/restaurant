"use client";

import { WEEKDAY_LABELS, WEEKDAYS, type WeekHoursInput } from "@/lib/admin/hours";
import { Checkbox } from "@/components/ui/Choice";

/** Часы по дням: один интервал на день (модель данных допускает несколько). */
export function WeekHoursEditor({ value, onChange, idPrefix }: { value: WeekHoursInput; onChange: (v: WeekHoursInput) => void; idPrefix: string }) {
  return (
    <div className="flex flex-col divide-y divide-line rounded-card border border-line">
      {WEEKDAYS.map((d) => {
        const interval = value[d][0];
        const off = !interval;
        return (
          <div key={d} className="flex flex-wrap items-center gap-1.5 px-1.5 py-1">
            <span className="w-15 text-sm font-semibold text-fg">{WEEKDAY_LABELS[d]}</span>
            <Checkbox
              label="Выходной"
              checked={off}
              onChange={(e) => onChange({ ...value, [d]: e.target.checked ? [] : [{ open: "11:00", close: "23:00" }] })}
            />
            {interval ? (
              <span className="flex flex-wrap items-center gap-1 text-sm">
                <label className="sr-only" htmlFor={`${idPrefix}-${d}-open`}>
                  Открытие, {WEEKDAY_LABELS[d]}
                </label>
                <input
                  id={`${idPrefix}-${d}-open`}
                  type="time"
                  value={interval.open}
                  onChange={(e) => onChange({ ...value, [d]: [{ ...interval, open: e.target.value }] })}
                  className="h-5.5 rounded-field border border-line-strong bg-surface px-1 text-base text-fg"
                />
                —
                <label className="sr-only" htmlFor={`${idPrefix}-${d}-close`}>
                  Закрытие, {WEEKDAY_LABELS[d]}
                </label>
                <input
                  id={`${idPrefix}-${d}-close`}
                  type="time"
                  value={interval.close}
                  onChange={(e) => onChange({ ...value, [d]: [{ ...interval, close: e.target.value }] })}
                  className="h-5.5 rounded-field border border-line-strong bg-surface px-1 text-base text-fg"
                />
                {interval.close <= interval.open ? (
                  <span className="basis-full text-xs text-fg-muted sm:basis-auto">до утра следующего дня</span>
                ) : null}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
