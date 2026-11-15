import type { Metadata } from "next";
import { Star } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { ReviewControls } from "@/components/admin/misc/ReviewControls";
import { requireAdmin } from "@/server/admin/auth";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Отзывы" };
/** Админка: переходы могут ждать данные (свежесть важнее мгновенного кадра). */
export const instant = false;

export default async function ReviewsAdminPage() {
  await requireAdmin("reviews");
  const rows = await db.review.findMany({ orderBy: [{ isPublished: "asc" }, { createdAt: "desc" }], take: 200 });
  return (
    <div className="flex max-w-240 flex-col gap-2">
      <AdminPageHeader title="Отзывы" description="Опубликованные отзывы показываются на главной (последние шесть)." />
      {rows.length === 0 ? <p className="text-fg-muted">Отзывов пока нет.</p> : null}
      <ul className="flex flex-col gap-1">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-1 rounded-card border border-line bg-surface p-2">
            <div className="flex flex-wrap items-center gap-1">
              <span className="font-semibold">{r.authorName}</span>
              <span className="inline-flex text-eyebrow" aria-label={`Оценка ${r.rating} из 5`} role="img">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={`size-2 ${i < r.rating ? "fill-current" : "opacity-30"}`} aria-hidden="true" />
                ))}
              </span>
              <span className="text-sm text-fg-muted">{r.createdAt.toLocaleDateString("ru-RU")}</span>
              <div className="ml-auto">
                <ReviewControls id={r.id} published={r.isPublished} author={r.authorName} />
              </div>
            </div>
            <p className="text-base text-fg">{r.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
