"use client";

import Link from "next/link";
import { useState } from "react";
import { CircleAlert, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { TextareaField, TextField } from "@/components/ui/Input";

/** Обратная связь: ответим по телефону или почте, которые оставит гость. */
export function ContactForm() {
  const [v, setV] = useState({ name: "", contact: "", message: "" });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-start gap-1.5 rounded-card border border-line bg-surface p-3">
        <MailCheck className="size-3 text-success" aria-hidden="true" />
        <p className="text-title font-semibold text-fg">Сообщение у нас</p>
        <p className="text-base text-fg-muted">Ответим в течение дня — обычно быстрее.</p>
      </div>
    );
  }

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!v.name.trim()) next.name = "Как к вам обращаться?";
    if (v.contact.trim().length < 3) next.contact = "Оставьте телефон или почту для ответа";
    if (v.message.trim().length < 5) next.message = "Напишите сообщение";
    if (!consent) next.consent = "Нужно ваше согласие";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, consent: true }),
      });
      const data = (await res.json()) as { error?: string; field?: string };
      if (!res.ok) return setErrors(data.field ? { [data.field]: data.error ?? "" } : { form: data.error ?? "Не получилось отправить" });
      setSent(true);
    } catch {
      setErrors({ form: "Нет связи. Проверьте интернет." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-2 rounded-card border border-line bg-surface p-2 md:p-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2 className="text-h3 font-semibold text-fg">Напишите нам</h2>
      <p className="text-sm text-fg-muted">Вопрос, пожелание или банкет — ответим по телефону или почте.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <TextField id="c-name" label="Имя" autoComplete="given-name" maxLength={60} value={v.name} error={errors.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        <TextField id="c-contact" label="Телефон или почта" autoComplete="email" maxLength={120} value={v.contact} error={errors.contact} onChange={(e) => setV({ ...v, contact: e.target.value })} />
      </div>
      <TextareaField id="c-message" label="Сообщение" rows={4} maxLength={2000} value={v.message} error={errors.message} onChange={(e) => setV({ ...v, message: e.target.value })} />
      <Checkbox
        checked={consent}
        onChange={(e) => setConsent(e.target.checked)}
        aria-invalid={errors.consent ? true : undefined}
        label={
          <>
            Согласен на обработку персональных данных по{" "}
            <Link href="/privacy" className="underline underline-offset-4">
              политике конфиденциальности
            </Link>
          </>
        }
      />
      {errors.consent ? <p className="-mt-1 text-sm text-accent">{errors.consent}</p> : null}
      {errors.form ? (
        <p role="alert" className="flex items-start gap-1 text-sm text-accent">
          <CircleAlert className="mt-px size-2 shrink-0" aria-hidden="true" />
          {errors.form}
        </p>
      ) : null}
      <Button type="submit" loading={busy} className="sm:self-start">
        Отправить
      </Button>
    </form>
  );
}
