"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type SwitchProps = Omit<ComponentProps<"button">, "onChange"> & {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: ReactNode;
  /** Скрыть подпись визуально (останется для скринридеров). */
  hideLabel?: boolean;
};

/** Переключатель (role="switch"): область нажатия 44 px. */
export function Switch({ checked, onCheckedChange, label, hideLabel, className, disabled, ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn("inline-flex min-h-5.5 items-center gap-1.5 disabled:opacity-50", className)}
      {...rest}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-3 w-5 shrink-0 rounded-full border-2 transition-colors duration-150",
          checked ? "border-matcha-deep bg-matcha-deep" : "border-line-strong bg-surface-2",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-white shadow-soft transition-[left] duration-150",
            checked ? "left-[calc(100%-18px)]" : "left-0.5",
          )}
        />
      </span>
      <span className={cn("text-sm text-fg", hideLabel && "sr-only")}>{label}</span>
    </button>
  );
}
