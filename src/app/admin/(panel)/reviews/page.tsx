import type { Metadata } from "next";
import { Star } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { MessageHandledButton } from "@/components/admin/misc/MessageHandledButton";
import { ReviewControls } from "@/components/admin/misc/ReviewControls";
import { requireAdmin } from "@/server/admin/auth";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Отзывы" };
/** Админка: переходы могут ждать данные (свежесть важнее мгновенного кадра). */
export const instant = false;

export default async function ReviewsAdminPage() {
  await requireAdmin("reviews");
  const [rows, messages] = await Promise.all([
    db.review.findMany({ orderBy: [{ isPublished: "asc" }, { createdAt: "desc" }], take: 200 }),
    db.contactMessage.findMany({ orderBy: [{ handledAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }], take: 100 }),
  ]);
  return (
    <div className="flex max-w-240 flex-col gap-2">
      <AdminPageHeader
        title="Отзывы"
        description="Гости оставляют отзыв на странице выполненного заказа. Опубликованные показываются на главной (последние шесть)."
      />
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

      <section id="messages" aria-labelledby="messages-title" className="flex scroll-mt-4 flex-col gap-1 pt-2">
        <h2 id="messages-title" className="text-h3 font-semibold text-fg">
          Сообщения с сайта
        </h2>
        <p className="text-sm text-fg-muted">Форма на странице «Контакты». Ответьте гостю по телефону или почте и отметьте сообщение.</p>
        {messages.length === 0 ? <p className="text-fg-muted">Сообщений пока нет.</p> : null}
        <ul className="flex flex-col gap-1">
          {messages.map((m) => (
            <li key={m.id} className={`flex flex-col gap-1 rounded-card border border-line bg-surface p-2 ${m.handledAt ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-semibold">{m.name}</span>
                {m.phone ? (
                  <a href={`tel:${m.phone}`} className="text-sm text-fg underline-offset-4 hover:underline">
                    {m.phone}
                  </a>
                ) : null}
                {m.email ? (
                  <a href={`mailto:${m.email}`} className="text-sm text-fg underline-offset-4 hover:underline">
                    {m.email}
                  </a>
                ) : null}
                <span className="text-sm text-fg-muted">{m.createdAt.toLocaleString("ru-RU")}</span>
                <div className="ml-auto">
                  <MessageHandledButton id={m.id} handled={Boolean(m.handledAt)} />
                </div>
              </div>
              <p className="text-base whitespace-pre-line text-fg">{m.message}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
