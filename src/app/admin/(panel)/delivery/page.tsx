import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { DeliveryAdmin } from "@/components/admin/delivery/DeliveryAdmin";
import { WEEKDAYS, type WeekHoursInput } from "@/lib/admin/hours";
import { parsePolygon } from "@/lib/geo/polygon";
import { requireAdmin } from "@/server/admin/auth";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Доставка" };
/** Админка: переходы могут ждать данные (свежесть важнее мгновенного кадра). */
export const instant = false;

export default async function DeliveryAdminPage() {
  await requireAdmin("delivery");
  const [s, rows] = await Promise.all([
    db.settings.findUniqueOrThrow({ where: { id: 1 } }),
    db.deliveryZone.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  const hours = s.orderHours as WeekHoursInput;
  const zones = rows.map((z) => ({
    id: z.id,
    name: z.name,
    color: z.color,
    fee: z.fee,
    minOrder: z.minOrder,
    freeFrom: z.freeFrom,
    etaMinutes: z.etaMinutes,
    isActive: z.isActive,
    sortOrder: z.sortOrder,
    polygon: parsePolygon(z.polygon) ?? [],
  }));
  return (
    <div className="flex max-w-300 flex-col gap-2">
      <AdminPageHeader title="Доставка" description="Зоны, стоимость, минимальная сумма и часы приёма заказов." />
      <DeliveryAdmin
        paused={s.ordersPaused}
        orderHours={Object.fromEntries(WEEKDAYS.map((d) => [d, hours[d] ?? []])) as WeekHoursInput}
        zones={zones}
        center={{ lat: s.lat, lng: s.lng }}
      />
    </div>
  );
}
