"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { TextareaField } from "@/components/ui/Input";
import { approveRefundAction, declineRefundAction } from "@/app/admin/(panel)/refunds/actions";

/** Решение по заявке на возврат: вернуть всю сумму или отказать с причиной. */
export function RefundDecision({ orderId, number, amountLabel }: { orderId: string; number: number; amountLabel: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [reason, setReason] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  const run = (fn: () => ReturnType<typeof approveRefundAction>) =>
    start(async () => {
      const res = await fn();
      setMessage(res.ok ? { ok: true, text: res.message ?? "Готово" } : { ok: false, text: res.error });
      if (res.ok) {
        dialog.current?.close();
        router.refresh();
      }
    });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        <Button
          size="sm"
          loading={pending}
          onClick={() => {
            if (window.confirm(`Вернуть ${amountLabel} гостю за заказ №${number}? Деньги уйдут на карту или счёт, с которых платили.`)) {
              run(() => approveRefundAction(orderId));
            }
          }}
        >
          Вернуть {amountLabel}
        </Button>
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => dialog.current?.showModal()}>
          Не возвращать
        </Button>
      </div>
      {message ? (
        <p role="status" className={message.ok ? "text-sm text-success" : "text-sm text-accent"}>
          {message.text}
        </p>
      ) : null}
      <dialog ref={dialog} aria-labelledby={`decline-${orderId}`} className="theme-light m-auto w-full max-w-narrow rounded-card bg-surface p-3 text-fg backdrop:bg-shade">
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => declineRefundAction(orderId, reason));
          }}
        >
          <h2 id={`decline-${orderId}`} className="text-h3 font-semibold">
            Не возвращать деньги за №{number}?
          </h2>
          <TextareaField
            id={`decline-reason-${orderId}`}
            label="Причина — для журнала"
            required
            minLength={3}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Например: гость забрал заказ, отмена ошибочная"
          />
          <div className="flex justify-end gap-1">
            <Button variant="ghost" onClick={() => dialog.current?.close()}>
              Назад
            </Button>
            <Button type="submit" loading={pending} disabled={reason.trim().length < 3}>
              Сохранить решение
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
