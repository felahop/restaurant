import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { OrdersFeed } from "@/components/admin/orders/OrdersFeed";
import { requireAdmin } from "@/server/admin/auth";
import { dayRange } from "@/server/admin/orders";

export const metadata: Metadata = { title: "Заказы" };
export const instant = false;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  await requireAdmin("orders");
  const [{ iso, timezone }, sp] = await Promise.all([dayRange(), searchParams]);
  return (
    <div className="flex flex-col gap-2">
      {sp.denied ? (
        <p role="alert" className="rounded-field border border-cinnabar px-2 py-1 text-sm text-fg">
          Этот раздел доступен только владельцу.
        </p>
      ) : null}
      <AdminPageHeader title="Заказы" description="Лента обновляется сама. Включите звук, чтобы слышать новые заказы." />
      <OrdersFeed timeZone={timezone} initialDate={iso} />
    </div>
  );
}
