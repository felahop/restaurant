"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/ui/Input";

/** Выпадающий список статуса с сохранением на лету. */
export function StatusSelect({
  value,
  options,
  label,
  onSave,
}: {
  value: string;
  options: { value: string; label: string }[];
  label: string;
  onSave: (next: string) => Promise<{ ok: boolean }>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Select
      aria-label={label}
      value={value}
      disabled={pending}
      className="h-5.5 min-w-20"
      onChange={(e) => {
        const next = e.target.value;
        start(async () => {
          await onSave(next);
          router.refresh();
        });
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
