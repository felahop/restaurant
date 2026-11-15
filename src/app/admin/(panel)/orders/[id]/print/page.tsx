import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/admin/auth";
import { getAdminOrder } from "@/server/admin/orders";
import { getSettings } from "@/server/settings";
import { AutoPrint } from "./AutoPrint";

export const metadata: Metadata = { title: "Чек для кухни" };
/** Админка: переходы могут ждать данные (свежесть важнее мгновенного кадра). */
export const instant = false;

/** Кухонный чек: ширина ленты 80 мм, крупные позиции, без цен. */
export default async function KitchenTicketPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("orders");
  const { id } = await params;
  const [order, settings] = await Promise.all([getAdminOrder(id), getSettings()]);
  if (!order) notFound();
  const time = (d: Date) =>
    new Intl.DateTimeFormat("ru-RU", { timeZone: settings.timezone, hour: "2-digit", minute: "2-digit" }).format(d);
  return (
    <div className="kitchen-ticket mx-auto w-[80mm] bg-white p-1 font-sans text-ink">
      <AutoPrint />
      <p className="text-h3 font-semibold">№{order.number}</p>
      <p className="text-base font-semibold">
        {order.type === "DELIVERY" ? "ДОСТАВКА" : "САМОВЫВОЗ"} · {order.scheduledFor ? `к ${time(order.scheduledFor)}` : "СРАЗУ"}
      </p>
      <p className="text-sm">Принят {time(order.createdAt)}</p>
      <hr className="my-1 border-ink" />
      <ul className="flex flex-col gap-0.5">
        {order.items.map((i) => (
          <li key={i.id} className="text-base">
            <b>{i.quantity} ×</b> {i.name}
            {i.modifiers.length ? <span className="block pl-2 text-sm">+ {i.modifiers.map((m) => m.name).join(", ")}</span> : null}
          </li>
        ))}
      </ul>
      <hr className="my-1 border-ink" />
      {order.comment ? <p className="text-base font-semibold">Комментарий: {order.comment}</p> : null}
      <p className="text-sm">Приборов: {order.cutlery}</p>
    </div>
  );
}
