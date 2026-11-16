"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LogOut, RotateCcw, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Input";
import { addItem } from "@/lib/cart/core";
import { cart } from "@/lib/cart/store";
import { plural } from "@/lib/money";
import { deleteAddressAction, repeatOrderAction, saveProfileAction } from "@/app/(site)/account/actions";

/** «Повторить»: блюда заказа по сегодняшним ценам попадают в корзину, затем — оформление. */
export function RepeatOrderButton({ orderId, number }: { orderId: string; number: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-0.5">
      <Button
        size="sm"
        variant="secondary"
        loading={pending}
        icon={<RotateCcw className="size-2" aria-hidden="true" />}
        aria-label={`Повторить заказ №${number}`}
        onClick={() =>
          start(async () => {
            const res = await repeatOrderAction(orderId);
            if (!res.ok) return setNote(res.error);
            let next = cart.snapshot();
            for (const l of res.data!.lines) next = addItem(next, { ...l, qty: l.qty });
            const count = res.data!.lines.reduce((s, l) => s + l.qty, 0);
            cart.replace(next, `В корзину добавлено ${count} ${plural(count, ["блюдо", "блюда", "блюд"])}`);
            if (res.data!.skipped.length) {
              setNote(`Сейчас нет: ${res.data!.skipped.join(", ")}`);
              window.setTimeout(() => router.push("/checkout"), 2500);
            } else router.push("/checkout");
          })
        }
      >
        Повторить
      </Button>
      {note ? (
        <p role="status" className="text-sm text-fg-muted">
          {note}
        </p>
      ) : null}
    </div>
  );
}

export function DeleteAddressButton({ id, text }: { id: string; text: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <IconButton
      label={`Удалить адрес: ${text}`}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deleteAddressAction(id);
          router.refresh();
        })
      }
    >
      <Trash2 className="size-2" aria-hidden="true" />
    </IconButton>
  );
}

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [v, setV] = useState({ name, email });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      noValidate
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveProfileAction(v);
          setErrors(res.ok ? {} : (res.fields ?? {}));
          setMessage(res.ok ? (res.message ?? "Сохранили") : res.error);
        });
      }}
    >
      <TextField id="profile-name" label="Имя" autoComplete="given-name" maxLength={60} value={v.name} error={errors.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
      <TextField
        id="profile-email"
        label="Почта"
        optional
        type="email"
        autoComplete="email"
        hint="Для электронных чеков при оплате онлайн"
        value={v.email}
        error={errors.email}
        onChange={(e) => setV({ ...v, email: e.target.value })}
      />
      <div className="flex items-center gap-1.5">
        <Button type="submit" loading={pending}>
          Сохранить
        </Button>
        <p role="status" className="text-sm text-fg-muted">
          {message}
        </p>
      </div>
    </form>
  );
}

export function LogoutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
      icon={<LogOut className="size-2" aria-hidden="true" />}
      onClick={() =>
        start(async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.refresh();
        })
      }
    >
      Выйти
    </Button>
  );
}
