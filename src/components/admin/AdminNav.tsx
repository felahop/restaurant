"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { AdminSection } from "@/server/admin/roles";
import { ADMIN_NAV } from "./nav-items";

export function AdminNav({ sections }: { sections: AdminSection[] }) {
  const pathname = usePathname();
  const items = ADMIN_NAV.filter((i) => sections.includes(i.section));
  return (
    <nav aria-label="Разделы админ-панели">
      <ul className="scrollbar-none flex gap-0.5 overflow-x-auto lg:flex-col">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-5.5 items-center gap-1 rounded-field px-1.5 text-sm font-semibold whitespace-nowrap transition-colors duration-150",
                  active ? "bg-ink text-paper" : "text-fg hover:bg-surface-2",
                )}
              >
                <Icon className="size-2" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
