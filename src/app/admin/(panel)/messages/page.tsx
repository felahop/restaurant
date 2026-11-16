import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { MessageHandledButton } from "@/components/admin/misc/MessageHandledButton";
import { requireAdmin } from "@/server/admin/auth";
import { db } from "@/server/db";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Сообщения" };
export const instant = false;

export default async function MessagesPage() {
  await requireAdmin("messages");
  const [messages, { timezone }] = await Promise.all([
    db.contactMessage.findMany({ orderBy: [{ handledAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }], take: 200 }),
    getSettings(),
  ]);
  const when = new Intl.DateTimeFormat("ru-RU", { timeZone: timezone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="flex max-w-240 flex-col gap-2">
      <AdminPageHeader
        title="Сообщения"
        description="Форма на странице «Контакты». Ответьте гостю по телефону или почте и отметьте сообщение обработанным."
      />
      {messages.length === 0 ? <p className="rounded-card border border-line bg-surface p-3 text-center text-fg-muted">Сообщений пока нет.</p> : null}
      <ul className="flex flex-col gap-1" aria-label="Сообщения с сайта">
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
              <span className="text-sm text-fg-muted">{when.format(m.createdAt)}</span>
              <div className="ml-auto">
                <MessageHandledButton id={m.id} handled={Boolean(m.handledAt)} />
              </div>
            </div>
            <p className="text-base whitespace-pre-line text-fg">{m.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
