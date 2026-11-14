import type { ComponentProps, ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

type ChoiceProps = Omit<ComponentProps<"input">, "type"> & {
  label: ReactNode;
  description?: ReactNode;
};

/** Чекбокс: квадрат 24 px внутри строки высотой не меньше 44 px. */
export function Checkbox({ label, description, className, disabled, ...rest }: ChoiceProps) {
  return (
    <label
      className={cn(
        "group flex min-h-5.5 cursor-pointer items-start gap-1.5 py-1",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span className="relative mt-px inline-flex size-3 shrink-0">
        <input
          type="checkbox"
          disabled={disabled}
          className="peer size-3 cursor-pointer appearance-none rounded-xs border-2 border-line-strong bg-surface transition-colors duration-150 checked:border-action checked:bg-action group-hover:border-fg-muted checked:group-hover:border-action disabled:cursor-not-allowed"
          {...rest}
        />
        <Check
          className="pointer-events-none absolute inset-0 m-auto size-2 text-on-action opacity-0 peer-checked:opacity-100"
          strokeWidth={3}
          aria-hidden="true"
        />
      </span>
      <span className="flex flex-col">
        <span className="text-base text-fg">{label}</span>
        {description ? <span className="text-sm text-fg-muted">{description}</span> : null}
      </span>
    </label>
  );
}

export function Radio({ label, description, className, disabled, ...rest }: ChoiceProps) {
  return (
    <label
      className={cn(
        "group flex min-h-5.5 cursor-pointer items-start gap-1.5 py-1",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span className="relative mt-px inline-flex size-3 shrink-0">
        <input
          type="radio"
          disabled={disabled}
          className="peer size-3 cursor-pointer appearance-none rounded-full border-2 border-line-strong bg-surface transition-colors duration-150 checked:border-action group-hover:border-fg-muted checked:group-hover:border-action disabled:cursor-not-allowed"
          {...rest}
        />
        <span
          className="pointer-events-none absolute inset-0 m-auto size-1.5 scale-0 rounded-full bg-action transition-transform duration-150 peer-checked:scale-100"
          aria-hidden="true"
        />
      </span>
      <span className="flex flex-col">
        <span className="text-base text-fg">{label}</span>
        {description ? <span className="text-sm text-fg-muted">{description}</span> : null}
      </span>
    </label>
  );
}

type SegmentOption<T extends string> = { value: T; label: ReactNode };

type SegmentedProps<T extends string> = {
  name: string;
  legend: string;
  options: readonly SegmentOption<T>[];
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
  className?: string;
};

/** Переключатель из 2–3 вариантов (например, «Доставка / Самовывоз»). Построен на радиокнопках. */
export function SegmentedControl<T extends string>({
  name,
  legend,
  options,
  value,
  defaultValue,
  onChange,
  className,
}: SegmentedProps<T>) {
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="sr-only">{legend}</legend>
      <div className="grid auto-cols-fr grid-flow-col rounded-full border border-line-strong bg-surface">
        {options.map((option) => (
          <label key={option.value} className="relative flex">
            <input
              type="radio"
              name={name}
              value={option.value}
              className="peer sr-only"
              {...(value !== undefined
                ? { checked: value === option.value, onChange: () => onChange?.(option.value) }
                : { defaultChecked: defaultValue === option.value, onChange: () => onChange?.(option.value) })}
            />
            <span className="flex h-5.5 w-full cursor-pointer items-center justify-center rounded-full px-2 text-sm font-semibold text-fg-muted transition-colors duration-150 peer-checked:bg-fg peer-checked:text-canvas peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus hover:text-fg peer-checked:hover:text-canvas">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
