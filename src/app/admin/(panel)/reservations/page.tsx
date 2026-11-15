import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { ReservationStatus } from "@/components/admin/misc/ReservationRow";
import { requireAdmin } from "@/server/admin/auth";
import { dayRange } from "@/server/admin/orders";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Брони" };
/** Админка: переходы могут ждать данные (свежесть важнее мгновенного кадра). */
export const instant = false;

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireAdmin("reservations");
  const { date } = await searchParams;
  const { from, iso, timezone } = await dayRange(date);
  // Брони на выбранный день и на неделю вперёд.
  const to = new Date(from.getTime() + 7 * 86_400_000);
  const rows = await db.reservation.findMany({ where: { startsAt: { gte: from, lt: to } }, orderBy: { startsAt: "asc" } });
  const fmt = new Intl.DateTimeFormat("ru-RU", { timeZone: timezone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="flex max-w-300 flex-col gap-2">
      <AdminPageHeader title="Брони" description="Брони на 7 дней с выбранной даты. Новые брони приходят и в Telegram." />
      <form className="flex items-end gap-1">
        <label className="flex flex-col gap-0.5 text-sm font-medium">
          С даты
          <input type="date" name="date" defaultValue={iso} className="h-5.5 rounded-field border border-line-strong bg-surface px-1.5 text-base" />
        </label>
        <button type="submit" className="h-5.5 rounded-full border-2 border-fg px-2 text-sm font-semibold">
          Показать
        </button>
      </form>
      {rows.length === 0 ? (
        <p className="rounded-card border border-line bg-surface p-3 text-center text-fg-muted">Броней пока нет.</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full min-w-90 text-left text-sm">
            <thead className="border-b border-line text-fg-muted">
              <tr>
                <th className="px-1.5 py-1 font-medium">Когда</th>
                <th className="px-1.5 py-1 font-medium">Гостей</th>
                <th className="px-1.5 py-1 font-medium">Имя и телефон</th>
                <th className="px-1.5 py-1 font-medium">Пожелания</th>
                <th className="px-1.5 py-1 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-1.5 py-1 font-semibold whitespace-nowrap">{fmt.format(r.startsAt)}</td>
                  <td className="px-1.5 py-1 tabular-nums">{r.guests}</td>
                  <td className="px-1.5 py-1">
                    {r.name}
                    <a href={`tel:${r.phone}`} className="block text-fg-muted underline-offset-4 hover:underline">
                      {r.phone}
                    </a>
                  </td>
                  <td className="px-1.5 py-1 text-fg-muted">{r.comment ?? "—"}</td>
                  <td className="px-1.5 py-1">
                    <ReservationStatus id={r.id} status={r.status} label={`Статус брони ${r.name}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
