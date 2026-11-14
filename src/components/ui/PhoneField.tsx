"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { formatPhoneInput } from "@/lib/phone";
import { Field } from "./Field";
import { Input } from "./Input";

type PhoneFieldProps = Omit<ComponentProps<"input">, "id" | "type" | "value" | "defaultValue" | "onChange"> & {
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  defaultValue?: string;
  onValueChange?: (formatted: string) => void;
};

/** Телефон с маской +7 (___) ___-__-__. В форму уходит отформатированная строка, сервер нормализует её в E.164. */
export function PhoneField({
  id,
  label = "Телефон",
  hint,
  error,
  defaultValue = "",
  onValueChange,
  className,
  ...rest
}: PhoneFieldProps) {
  const [value, setValue] = useState(() => formatPhoneInput(defaultValue));

  return (
    <Field id={id} label={label} hint={hint} error={error} className={className}>
      {(a11y) => (
        <Input
          {...rest}
          {...a11y}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+7 (___) ___-__-__"
          value={value}
          onChange={(e) => {
            const next = formatPhoneInput(e.target.value);
            setValue(next);
            onValueChange?.(next);
          }}
        />
      )}
    </Field>
  );
}
