"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CircleAlert, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { TextField } from "@/components/ui/Input";
import { PhoneField } from "@/components/ui/PhoneField";
import { startCartSync } from "@/components/site/CartSync";

type Step = { kind: "phone" } | { kind: "code"; phone: string; demoCode?: string };

/** Вход по номеру телефона и коду из SMS, без пароля. */
export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "phone" });
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  const requestCode = async () => {
    setError(null);
    if (!consent) return setError("Нужно согласие на обработку персональных данных");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, consent: true }),
      });
      const data = (await res.json()) as { error?: string; resendIn?: number; demoCode?: string };
      if (!res.ok) return setError(data.error ?? "Не получилось отправить код");
      setStep({ kind: "code", phone, demoCode: data.demoCode });
      setResendIn(data.resendIn ?? 60);
      setCode("");
      window.setTimeout(() => codeRef.current?.focus(), 0);
    } catch {
      setError("Нет связи. Проверьте интернет.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    if (step.kind !== "code" || value.length !== 4) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: step.phone, code: value }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не получилось войти");
        setCode("");
        codeRef.current?.focus();
        return;
      }
      await startCartSync();
      router.refresh();
    } catch {
      setError("Нет связи. Проверьте интернет.");
    } finally {
      setBusy(false);
    }
  };

  const errorBox = error ? (
    <p role="alert" className="flex items-start gap-1 text-sm text-accent">
      <CircleAlert className="mt-px size-2 shrink-0" aria-hidden="true" />
      {error}
    </p>
  ) : null;

  return (
    <div className="mx-auto flex w-full max-w-narrow flex-col gap-3 rounded-card border border-line bg-surface p-3 md:p-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-h3 text-fg">Вход по номеру</h2>
        <p className="text-sm text-fg-muted">
          Без пароля: пришлём код в SMS. В кабинете — история заказов, повтор в одно касание, адреса и бонусы.
        </p>
      </div>

      {step.kind === "phone" ? (
        <form
          noValidate
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void requestCode();
          }}
        >
          <PhoneField id="login-phone" onValueChange={setPhone} autoFocus />
          <Checkbox
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            label={
              <>
                Согласен на обработку персональных данных по{" "}
                <Link href="/privacy" className="underline underline-offset-4">
                  политике конфиденциальности
                </Link>
              </>
            }
          />
          {errorBox}
          <Button type="submit" size="lg" block loading={busy}>
            Получить код
          </Button>
        </form>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void verify(code);
          }}
        >
          <p className="flex flex-wrap items-center gap-x-1 text-base text-fg">
            <span>
              Код отправлен на <b className="font-semibold whitespace-nowrap tabular-nums">{step.phone}</b>
            </span>
            <button
              type="button"
              className="inline-flex min-h-5.5 items-center text-sm text-fg-muted underline underline-offset-4 hover:text-fg"
              onClick={() => {
                setStep({ kind: "phone" });
                setError(null);
              }}
            >
              Изменить номер
            </button>
          </p>
          {step.demoCode ? (
            <p className="flex items-start gap-1 rounded-field border border-line-strong p-1.5 text-sm text-fg" role="status">
              <Info className="mt-px size-2 shrink-0 text-eyebrow" aria-hidden="true" />
              <span>
                Демо-режим: SMS-сервис ещё не подключён, сообщение не отправлялось. Ваш код:{" "}
                <b className="font-semibold tabular-nums">{step.demoCode}</b>
              </span>
            </p>
          ) : null}
          <TextField
            ref={codeRef}
            id="login-code"
            label="Код из SMS"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={4}
            value={code}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              setCode(v);
              if (v.length === 4) void verify(v);
            }}
            className="tabular-nums"
          />
          {errorBox}
          <Button type="submit" size="lg" block loading={busy} disabled={code.length !== 4}>
            Войти
          </Button>
          <Button type="button" variant="ghost" disabled={resendIn > 0 || busy} onClick={() => void requestCode()}>
            {resendIn > 0 ? `Новый код через ${resendIn} с` : "Отправить код ещё раз"}
          </Button>
        </form>
      )}
    </div>
  );
}
