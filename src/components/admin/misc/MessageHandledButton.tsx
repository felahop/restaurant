"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { setMessageHandledAction } from "@/app/admin/(panel)/reviews/actions";

export function MessageHandledButton({ id, handled }: { id: string; handled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={handled ? "ghost" : "secondary"}
      loading={pending}
      onClick={() =>
        start(async () => {
          await setMessageHandledAction(id, !handled);
          router.refresh();
        })
      }
    >
      {handled ? "Вернуть в работу" : "Обработано"}
    </Button>
  );
}
