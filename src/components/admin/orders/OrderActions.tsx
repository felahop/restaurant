"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Printer, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextareaField } from "@/components/ui/Input";
import { canTransition, FLOW, statusLabel, type OrderStatusValue, type OrderTypeValue } from "@/lib/order/status";
import { setOrderStatusAction } from "@/app/admin/(panel)/orders/actions";

export function OrderActions({ id, status, type }: { id: string; status: OrderStatusValue; type: OrderTypeValue }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [reason, setReason] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  const run = (to: OrderStatusValue, why?: string) =>
    start(async () => {
      const res = await setOrderStatusAction(id, to, why);
      setMessage({ ok: res.ok, text: res.ok ? (res.message ?? "Готово") : res.error });
      if (res.ok) {
        dialog.current?.close();
        router.refresh();
      }
    });

  const targets = FLOW[type].filter((s) => canTransition(status, s, type));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1">
        {targets.map((s, i) => (
          <Button key={s} size="md" variant={i === 0 ? "primary" : "secondary"} disabled={pending} onClick={() => run(s)}>
            {statusLabel(s, type)}
          </Button>
        ))}
        {canTransition(status, "CANCELED", type) ? (
          <Button size="md" variant="ghost" icon={<XCircle className="size-2.5" aria-hidden="true" />} onClick={() => dialog.current?.showModal()}>
            Отменить заказ
          </Button>
        ) : null}
        <a
          href={`/admin/orders/${id}/print`}
          target="_blank"
          rel="noopener"
          className="inline-flex h-6 items-center gap-1 rounded-full px-2 font-semibold text-fg hover:bg-surface-2"
        >
          <Printer className="size-2.5" aria-hidden="true" />
          Печать для кухни
        </a>
      </div>
      {message ? (
        <p role="status" className={message.ok ? "text-sm text-success" : "text-sm text-accent"}>
          {message.text}
        </p>
      ) : null}

      <dialog ref={dialog} aria-labelledby="cancel-title" className="theme-light m-auto w-full max-w-narrow rounded-card bg-surface p-3 text-fg backdrop:bg-shade">
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run("CANCELED", reason);
          }}
        >
          <h2 id="cancel-title" className="text-h3 font-semibold">
            Отменить заказ?
          </h2>
          <TextareaField
            id="cancel-reason"
            label="Причина — её увидит гость"
            required
            minLength={3}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Например: закончился бульон для рамена"
          />
          <div className="flex justify-end gap-1">
            <Button variant="ghost" onClick={() => dialog.current?.close()}>
              Не отменять
            </Button>
            <Button type="submit" loading={pending} disabled={reason.trim().length < 3}>
              Отменить заказ
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
