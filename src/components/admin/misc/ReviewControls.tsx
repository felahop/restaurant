"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { deleteReviewAction, setReviewPublishedAction } from "@/app/admin/(panel)/reviews/actions";

export function ReviewControls({ id, published, author }: { id: string; published: boolean; author: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-1">
      <Switch
        checked={published}
        disabled={pending}
        label={published ? "На главной" : "Скрыт"}
        aria-label={`Опубликовать отзыв: ${author}`}
        onCheckedChange={(next) =>
          start(async () => {
            await setReviewPublishedAction(id, next);
            router.refresh();
          })
        }
      />
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          window.confirm("Удалить отзыв?") &&
          start(async () => {
            await deleteReviewAction(id);
            router.refresh();
          })
        }
      >
        Удалить
      </Button>
    </div>
  );
}
