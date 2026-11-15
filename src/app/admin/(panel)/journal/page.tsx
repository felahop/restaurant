import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { buttonStyles } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Input";
import { requireAdmin } from "@/server/admin/auth";
import { isAuditSection, listJournal, SECTION_LABELS } from "@/server/admin/journal";
import { db } from "@/server/db";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Журнал" };
export const instant = false;

type Search = { section?: string; staff?: string; after?: string };

export default async function JournalPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin("journal");
  const sp = await searchParams;
  const section = isAuditSection(sp.section) ? sp.section : undefined;
  const staffId = typeof sp.staff === "string" && sp.staff ? sp.staff : undefined;
  const [{ rows, next }, staff, { timezone }] = await Promise.all([
    listJournal({ section, adminId: staffId, cursor: typeof sp.after === "string" ? sp.after : undefined }),
    db.adminUser.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, login: true } }),
    getSettings(),
  ]);
  const when = new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const query = (extra: Record<string, string>) =>
    new URLSearchParams({ ...(section ? { section } : {}), ...(staffId ? { staff: staffId } : {}), ...extra }).toString();

  return (
    <div className="flex max-w-240 flex-col gap-2">
      <AdminPageHeader
        title="Журнал"
        description="Кто и что менял в админ-панели: заказы, меню, цены, доставка, акции, сотрудники, входы. Записи не редактируются."
      />
      <form method="get" className="flex flex-wrap items-end gap-1.5 rounded-card border border-line bg-surface p-2">
        <div className="min-w-30 flex-1">
          <SelectField id="j-section" name="section" label="Раздел" defaultValue={section ?? ""}>
            <option value="">Все разделы</option>
            {Object.entries(SECTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="min-w-30 flex-1">
          <SelectField id="j-staff" name="staff" label="Сотрудник" defaultValue={staffId ?? ""}>
            <option value="">Все сотрудники</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.login})
              </option>
            ))}
          </SelectField>
        </div>
        <button type="submit" className={buttonStyles({ variant: "secondary" })}>
          Показать
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="rounded-card border border-line bg-surface p-3 text-center text-fg-muted">Записей пока нет.</p>
      ) : (
        <ol className="flex flex-col divide-y divide-line rounded-card border border-line bg-surface" aria-label="Действия сотрудников">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-0.5 px-2 py-1.5 md:flex-row md:items-baseline md:gap-2">
              <time dateTime={r.createdAt.toISOString()} className="shrink-0 text-sm text-fg-muted tabular-nums md:w-15">
                {when.format(r.createdAt)}
              </time>
              <span className="shrink-0 text-sm font-semibold text-fg md:w-20">
                {r.adminName}
                <span className="block text-xs font-regular text-fg-muted">
                  {isAuditSection(r.section) ? SECTION_LABELS[r.section] : r.section}
                </span>
              </span>
              <span className="min-w-0 flex-1 text-base text-fg">{r.summary}</span>
            </li>
          ))}
        </ol>
      )}
      {next ? (
        <Link href={`/admin/journal?${query({ after: next })}`} className={buttonStyles({ variant: "secondary", className: "self-start" })}>
          Показать ещё
        </Link>
      ) : null}
    </div>
  );
}
