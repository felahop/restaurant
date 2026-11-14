import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

export type ControlA11yProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

type FieldProps = {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  className?: string;
  /** Получает id и aria-атрибуты, которые нужно передать в поле. */
  children: (control: ControlA11yProps) => ReactNode;
};

/** Обёртка поля формы: подпись, подсказка и ошибка, связанные с полем через aria-describedby. */
export function Field({ id, label, hint, error, optional, className, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {optional ? <span className="font-regular text-fg-muted"> — необязательно</span> : null}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {error ? (
        <p id={errorId} className="flex items-start gap-1 text-sm text-accent">
          <CircleAlert className="mt-px size-2 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className="text-sm text-fg-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Общие стили однострочных полей: высота 48 px, обводка ≥ 3:1 к фону. */
export const fieldControlStyles =
  "w-full rounded-field border border-line-strong bg-surface px-2 text-base text-fg " +
  "placeholder:text-fg-muted transition-colors duration-150 " +
  "hover:border-fg-muted focus-visible:border-focus focus-visible:outline-2 focus-visible:outline-offset-0 " +
  "aria-[invalid=true]:border-cinnabar disabled:cursor-not-allowed disabled:opacity-50";
