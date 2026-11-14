"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

type QuantityStepperProps = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** Название позиции для подписей кнопок: «Убрать одну порцию: Том ям». */
  itemName: string;
  size?: "sm" | "md";
  className?: string;
};

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  itemName,
  size = "sm",
  className,
}: QuantityStepperProps) {
  const btn = cn(
    "inline-flex shrink-0 items-center justify-center rounded-full text-fg transition-colors duration-150 hover:bg-surface-2 disabled:opacity-40 disabled:hover:bg-transparent",
    size === "sm" ? "size-5.5" : "size-6",
  );
  return (
    <div
      className={cn("inline-flex items-center rounded-full border border-line-strong bg-surface", className)}
      role="group"
      aria-label={`Количество: ${itemName}`}
    >
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={`Убрать одну порцию: ${itemName}`}
      >
        <Minus className="size-2" aria-hidden="true" />
      </button>
      <output className="min-w-3 text-center text-base font-semibold tabular-nums" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={`Добавить ещё порцию: ${itemName}`}
      >
        <Plus className="size-2" aria-hidden="true" />
      </button>
    </div>
  );
}
