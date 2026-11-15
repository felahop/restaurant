"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function MockPayButtons({ id }: { id: string }) {
  const [busy, setBusy] = useState<"succeed" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (action: "succeed" | "cancel") => {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/payments/mock/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = (await res.json()) as { redirect?: string; error?: string };
      if (!res.ok || !body.redirect) throw new Error(body.error ?? "Ошибка");
      window.location.assign(body.redirect);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Button size="lg" block loading={busy === "succeed"} disabled={busy !== null} onClick={() => act("succeed")}>
        Оплатить
      </Button>
      <Button
        size="lg"
        block
        variant="secondary"
        loading={busy === "cancel"}
        disabled={busy !== null}
        onClick={() => act("cancel")}
      >
        Отказаться от оплаты
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      ) : null}
    </div>
  );
}
