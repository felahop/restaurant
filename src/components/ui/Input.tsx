import type { ComponentProps, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { Field, fieldControlStyles } from "./Field";

/**
 * Поле без подписи. Ширина — 100 % родителя (задавайте её обёрткой), dense — компактная высота 44 px для плотных списков админки.
 */
export function Input({ className, dense, ...rest }: ComponentProps<"input"> & { dense?: boolean }) {
  return <input className={cn(fieldControlStyles, dense ? "h-5.5" : "h-6", className)} {...rest} />;
}

export function Textarea({ className, rows = 3, ...rest }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={cn(fieldControlStyles, "min-h-12 py-1.5", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(fieldControlStyles, "h-6 appearance-none pr-5", className)} {...rest}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2 size-2.5 -translate-y-1/2 text-fg-muted"
        aria-hidden="true"
      />
    </div>
  );
}

type LabelledProps = {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  className?: string;
};

export function TextField({
  id,
  label,
  hint,
  error,
  optional,
  className,
  ...input
}: LabelledProps & Omit<ComponentProps<"input">, "id">) {
  return (
    <Field id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      {(a11y) => <Input {...input} {...a11y} />}
    </Field>
  );
}

export function TextareaField({
  id,
  label,
  hint,
  error,
  optional,
  className,
  ...textarea
}: LabelledProps & Omit<ComponentProps<"textarea">, "id">) {
  return (
    <Field id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      {(a11y) => <Textarea {...textarea} {...a11y} />}
    </Field>
  );
}

export function SelectField({
  id,
  label,
  hint,
  error,
  optional,
  className,
  children,
  ...select
}: LabelledProps & Omit<ComponentProps<"select">, "id">) {
  return (
    <Field id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      {(a11y) => (
        <Select {...select} {...a11y}>
          {children}
        </Select>
      )}
    </Field>
  );
}
