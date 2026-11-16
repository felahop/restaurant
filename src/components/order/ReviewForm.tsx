"use client";

import { useState } from "react";
import { CircleAlert, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextareaField, TextField } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

const LABELS = ["", "Плохо", "Так себе", "Нормально", "Хорошо", "Отлично"];

/** Отзыв о выполненном заказе. Ссылка на заказ неугадываемая — она и подтверждает, что гость был нашим. */
export function ReviewForm({ token, defaultName }: { token: string; defaultName: string }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p role="status" className="rounded-card border border-line bg-surface p-2 text-base text-fg">
        Спасибо! Отзыв появится на сайте после проверки.
      </p>
    );
  }

  return (
    <form
      id="review"
      noValidate
      className="flex scroll-mt-12 flex-col gap-2 rounded-card border border-line bg-surface p-2 md:p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        if (!rating) return setError("Поставьте оценку — от 1 до 5 звёзд");
        if (text.trim().length < 10) return setError("Напишите пару слов — хотя бы 10 символов");
        setBusy(true);
        try {
          const res = await fetch(`/api/orders/${token}/review`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rating, text, name }),
          });
          const body = (await res.json()) as { error?: string };
          if (!res.ok) return setError(body.error ?? "Не получилось отправить отзыв");
          setDone(true);
        } catch {
          setError("Нет связи. Попробуйте ещё раз.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-title font-semibold text-fg">Как вам заказ?</h2>
      <fieldset className="flex flex-col gap-0.5">
        <legend className="mb-0.5 text-sm font-medium text-fg">Оценка</legend>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="group relative inline-flex size-5.5 cursor-pointer items-center justify-center">
              <input
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                className="peer sr-only"
                aria-label={`${n} из 5 — ${LABELS[n]}`}
              />
              <Star
                className={cn(
                  "size-3 transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-focus",
                  n <= rating ? "fill-current text-eyebrow" : "text-fg-muted group-hover:text-eyebrow",
                )}
                aria-hidden="true"
              />
            </label>
          ))}
          <span className="ml-1 text-sm text-fg-muted" aria-hidden="true">
            {LABELS[rating]}
          </span>
        </div>
      </fieldset>
      <TextareaField id="review-text" label="Отзыв" rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
      <TextField id="review-name" label="Имя для публикации" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
      {error ? (
        <p role="alert" className="flex items-start gap-1 text-sm text-accent">
          <CircleAlert className="mt-px size-2 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
      <Button type="submit" loading={busy} className="self-start">
        Отправить отзыв
      </Button>
    </form>
  );
}
