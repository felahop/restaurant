"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarCheck, CircleAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { TextareaField, TextField } from "@/components/ui/Input";
import { PhoneField } from "@/components/ui/PhoneField";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import type { BookingDay } from "@/lib/booking";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/money";
import { toE164 } from "@/lib/phone";

type Props = {
  days: BookingDay[];
  maxGuests: number;
  phoneDisplay: string;
  phoneE164: string;
  defaults: { name: string; phone: string };
};

const GUESTS = ["гость", "гостя", "гостей"] as const;

/** Бронь в три шага на одном экране: день и время → гости → контакты. */
export function BookingForm({ days, maxGuests, phoneDisplay, phoneE164, defaults }: Props) {
  const [date, setDate] = useState(days[0]?.date ?? "");
  const [time, setTime] = useState<string | null>(null);
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState(defaults.name);
  const [phone, setPhone] = useState(defaults.phone);
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const day = days.find((d) => d.date === date);

  if (done) {
    return (
      <div role="status" className="flex flex-col items-start gap-2 rounded-card border border-line bg-surface p-3 md:p-4">
        <CalendarCheck className="size-4 text-success" aria-hidden="true" />
        <h2 className="font-display text-h3 text-fg">Бронь принята</h2>
        <p className="text-lead text-fg">
          {done}, {guests} {plural(guests, GUESTS)}.
        </p>
        <p className="text-base text-fg-muted">Перезвоним, чтобы подтвердить. Если планы изменятся — позвоните нам.</p>
        <a href={`tel:${phoneE164}`} className="text-lead font-semibold text-fg tabular-nums underline-offset-4 hover:underline">
          {phoneDisplay}
        </a>
      </div>
    );
  }

  if (!days.length) {
    return <p className="text-base text-fg-muted">Ближайшие две недели свободных дат нет — позвоните нам: {phoneDisplay}.</p>;
  }

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!time) next.time = "Выберите время";
    if (!name.trim()) next.name = "Как к вам обращаться?";
    if (!toE164(phone)) next.phone = "Нужно 10 цифр после +7";
    if (!consent) next.consent = "Нужно ваше согласие";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: time, guests, name, phone, comment: comment || undefined, consent: true }),
      });
      const data = (await res.json()) as { error?: string; whenLabel?: string; code?: string };
      if (!res.ok) {
        if (data.code === "TIME_INVALID" || data.code === "FULL") setTime(null);
        setErrors({ form: data.error ?? "Не получилось забронировать" });
        return;
      }
      setDone(data.whenLabel ?? "");
    } catch {
      setErrors({ form: "Нет связи. Проверьте интернет и попробуйте ещё раз." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      noValidate
      className="flex min-w-0 flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <fieldset className="flex min-w-0 flex-col gap-1.5 rounded-card border border-line bg-surface p-2 md:p-3">
        <legend className="sr-only">Дата и время</legend>
        <h2 className="text-h3 font-semibold text-fg" aria-hidden="true">
          Когда
        </h2>
        <div role="group" aria-label="День" className="scrollbar-none -mx-2 flex gap-1 overflow-x-auto px-2 md:mx-0 md:flex-wrap md:px-0">
          {days.map((d) => (
            <button
              key={d.date}
              type="button"
              aria-pressed={d.date === date}
              aria-label={d.label}
              onClick={() => {
                setDate(d.date);
                setTime(null);
              }}
              className={cn(
                "flex min-h-7 min-w-9 shrink-0 flex-col items-center justify-center rounded-field border px-1.5 transition-colors duration-150",
                d.date === date ? "border-fg bg-fg text-canvas" : "border-line-strong text-fg hover:border-fg",
              )}
            >
              <span className="text-xs font-semibold">{d.short}</span>
              <span className="text-sm">{d.label.split(", ")[1]}</span>
            </button>
          ))}
        </div>
        <div role="group" aria-label="Время" aria-describedby={errors.time ? "time-error" : undefined} className="grid grid-cols-4 gap-1 sm:grid-cols-6 md:grid-cols-8">
          {day?.times.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={time === t.value}
              disabled={t.seatsLeft < guests}
              title={t.seatsLeft < guests ? (t.seatsLeft ? `Свободно мест: ${t.seatsLeft}` : "Зал занят") : undefined}
              aria-label={t.seatsLeft < guests ? `${t.time} — ${t.seatsLeft ? `свободно мест: ${t.seatsLeft}` : "занято"}` : undefined}
              onClick={() => {
                setTime(t.value);
                setErrors((e) => ({ ...e, time: "" }));
              }}
              className={cn(
                "inline-flex h-5.5 items-center justify-center rounded-full border text-sm font-semibold tabular-nums transition-colors duration-150 disabled:cursor-not-allowed disabled:border-line disabled:text-fg-muted disabled:line-through",
                time === t.value ? "border-fg bg-fg text-canvas" : "border-line-strong text-fg hover:border-fg",
              )}
            >
              {t.time}
            </button>
          ))}
        </div>
        {errors.time ? (
          <p id="time-error" className="text-sm text-accent">
            {errors.time}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2 border-t border-line pt-1.5">
          <span className="flex items-center gap-1 text-base text-fg">
            <Users className="size-2 text-ginger" aria-hidden="true" />
            Гостей
          </span>
          <QuantityStepper
            value={guests}
            min={1}
            max={maxGuests}
            onChange={(n) => {
              setGuests(n);
              // Выбранное время могло перестать вмещать компанию — сбрасываем.
              const chosen = day?.times.find((t) => t.value === time);
              if (chosen && chosen.seatsLeft < n) setTime(null);
            }}
            itemName="гостей"
            labels={{ group: "Число гостей", decrement: "Меньше гостей", increment: "Больше гостей" }}
          />
        </div>
        <p className="text-sm text-fg-muted">
          Больше {maxGuests} гостей или банкет — позвоните:{" "}
          <a href={`tel:${phoneE164}`} className="font-semibold text-fg underline-offset-4 hover:underline">
            {phoneDisplay}
          </a>
        </p>
      </fieldset>

      <fieldset className="flex min-w-0 flex-col gap-2 rounded-card border border-line bg-surface p-2 md:p-3">
        <legend className="sr-only">Контакты</legend>
        <h2 className="text-h3 font-semibold text-fg" aria-hidden="true">
          Кто придёт
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <TextField id="b-name" label="Имя" autoComplete="given-name" maxLength={60} value={name} error={errors.name} onChange={(e) => setName(e.target.value)} />
          <PhoneField id="b-phone" defaultValue={phone} error={errors.phone} hint="Позвоним, чтобы подтвердить бронь" onValueChange={setPhone} />
        </div>
        <TextareaField
          id="b-comment"
          label="Пожелания"
          optional
          rows={2}
          maxLength={500}
          placeholder="Например: стол у окна, будет детский стул"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <Checkbox
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked);
            setErrors((er) => ({ ...er, consent: "" }));
          }}
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
        <Button type="submit" size="lg" loading={busy} className="sm:self-start">
          {time && day ? `Забронировать · ${day.short.toLowerCase()}, ${day.times.find((t) => t.value === time)?.time}` : "Забронировать стол"}
        </Button>
      </fieldset>
    </form>
  );
}
