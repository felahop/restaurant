import Link from "next/link";
import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { Hanko } from "@/components/brand/Hanko";
import { AdminNav } from "@/components/admin/AdminNav";
import { ADMIN_NAV } from "@/components/admin/nav-items";
import { requireAdmin } from "@/server/admin/auth";
import { canAccess, roleLabels } from "@/server/admin/roles";
import { logoutAction } from "./actions";

/** Админке можно ждать данные при переходе между разделами: важнее свежие заказы, чем мгновенный кадр. */
export const instant = false;

/** Разделы и имя сотрудника — по сессии (внутри Suspense). Права на данные проверяет каждая страница сама. */
async function SidebarContent() {
  const admin = await requireAdmin();
  const sections = ADMIN_NAV.map((i) => i.section).filter((s) => canAccess(admin.role, s));
  return (
    <>
      <AdminNav sections={sections} />
      <div className="mt-auto hidden flex-col gap-1 border-t border-line pt-2 lg:flex">
        <p className="text-sm text-fg">
          {admin.name}
          <span className="block text-xs text-fg-muted">{roleLabels[admin.role]}</span>
        </p>
        <form action={logoutAction}>
          <button type="submit" className="inline-flex min-h-5.5 items-center gap-1 text-sm text-fg-muted hover:text-fg">
            <LogOut className="size-2" aria-hidden="true" />
            Выйти
          </button>
        </form>
        <Link href="/" className="text-sm text-fg-muted hover:text-fg">
          Открыть сайт →
        </Link>
      </div>
    </>
  );
}

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[1440px] flex-col lg:flex-row">
      <aside className="flex flex-col gap-2 border-b border-line bg-surface px-2 py-1.5 lg:sticky lg:top-0 lg:h-dvh lg:w-30 lg:shrink-0 lg:border-r lg:border-b-0 lg:py-3">
        <div className="flex items-center justify-between gap-1">
          <Link href="/admin/orders" className="inline-flex min-h-5.5 items-center gap-1">
            <Hanko className="size-4" />
            <span className="font-display text-title text-fg">Админка</span>
          </Link>
          <form action={logoutAction} className="lg:hidden">
            <button type="submit" className="inline-flex min-h-5.5 items-center gap-1 rounded-field px-1 text-sm text-fg-muted hover:text-fg">
              <LogOut className="size-2" aria-hidden="true" />
              Выйти
            </button>
          </form>
        </div>
        <Suspense fallback={<div className="h-5.5 animate-pulse rounded-field bg-surface-2 lg:h-40" />}>
          <SidebarContent />
        </Suspense>
      </aside>
      <main id="main" className="min-w-0 flex-1 px-2 py-3 md:px-3 lg:py-4">
        {children}
      </main>
    </div>
  );
}
