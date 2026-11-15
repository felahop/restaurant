import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { PromoCodes } from "@/components/admin/marketing/PromoCodes";
import { Promotions } from "@/components/admin/marketing/Promotions";
import { requireAdmin } from "@/server/admin/auth";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Маркетинг" };
/** Админка: переходы могут ждать данные (свежесть важнее мгновенного кадра). */
export const instant = false;

export default async function MarketingPage() {
  await requireAdmin("marketing");
  const [codes, promotions] = await Promise.all([
    db.promoCode.findMany({ orderBy: { createdAt: "desc" } }),
    db.promotion.findMany({ orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] }),
  ]);
  const iso = (d: Date | null) => (d ? d.toISOString() : null);
  return (
    <div className="flex max-w-300 flex-col gap-3">
      <AdminPageHeader title="Маркетинг" description="Промокоды применяются в корзине. Акции и баннеры появляются на сайте сразу." />
      <PromoCodes
        rows={codes.map((c) => ({
          id: c.id,
          code: c.code,
          type: c.type,
          value: c.value,
          minOrder: c.minOrder,
          startsAt: iso(c.startsAt),
          endsAt: iso(c.endsAt),
          usageLimit: c.usageLimit,
          usedCount: c.usedCount,
          isActive: c.isActive,
        }))}
      />
      <Promotions
        rows={promotions.map((p) => ({
          id: p.id,
          kind: p.kind,
          badge: p.badge,
          title: p.title,
          text: p.text,
          period: p.period,
          kanji: p.kanji,
          imageUrl: p.imageUrl,
          ctaLabel: p.ctaLabel,
          ctaHref: p.ctaHref,
          startsAt: iso(p.startsAt),
          endsAt: iso(p.endsAt),
          isActive: p.isActive,
          sortOrder: p.sortOrder,
        }))}
      />
    </div>
  );
}
