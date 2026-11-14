import { Clock, Gift, ShoppingBag, Truck } from "lucide-react";
import { restaurant } from "@/config/restaurant";
import { formatRub } from "@/lib/money";

/** Плашка с условиями доставки цифрами. На телефоне — два главных пункта. */
export function TopBar() {
  const { delivery, bonus } = restaurant;
  const items = [
    {
      key: "free",
      Icon: Truck,
      text: (
        <>
          Бесплатно от <b className="font-semibold text-fg">{formatRub(delivery.freeFrom)}</b>
        </>
      ),
      mobile: true,
    },
    {
      key: "eta",
      Icon: Clock,
      text: (
        <>
          <span className="hidden sm:inline">Привезём за </span>
          <b className="font-semibold text-fg">
            {delivery.etaMinutes.from}–{delivery.etaMinutes.to} мин
          </b>
        </>
      ),
      mobile: true,
    },
    {
      key: "min",
      Icon: ShoppingBag,
      text: (
        <>
          Заказ от <b className="font-semibold text-fg">{formatRub(delivery.minOrder)}</b>
        </>
      ),
      mobile: false,
    },
    {
      key: "bonus",
      Icon: Gift,
      text: (
        <>
          Возвращаем <b className="font-semibold text-fg">{bonus.earnPercent}%</b> бонусами
        </>
      ),
      mobile: false,
    },
  ];

  return (
    <aside aria-label="Условия доставки" className="border-b border-line bg-surface">
      <ul className="mx-auto flex h-5 max-w-site items-center justify-center gap-2 px-2 sm:gap-3 text-xs text-fg-muted md:justify-between md:px-3">
        {items.map(({ key, Icon, text, mobile }) => (
          <li key={key} className={mobile ? "flex items-center gap-1" : "hidden items-center gap-1 md:flex"}>
            <Icon className="size-2 shrink-0 text-ginger" aria-hidden="true" />
            <span className="whitespace-nowrap">{text}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
