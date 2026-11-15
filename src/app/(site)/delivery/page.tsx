import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { Banknote, Clock, CreditCard, QrCode, Store, Truck } from "lucide-react";
import { ZonesMap } from "@/components/delivery/ZonesMap";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/Typography";
import { formatRub } from "@/lib/money";
import { formatWeekHours } from "@/lib/order/schedule";
import { getSettings } from "@/server/settings";
import { getZones } from "@/server/zones";

export const metadata: Metadata = {
  title: "Доставка и оплата",
  description: "Зоны доставки, стоимость и минимальная сумма заказа, время доставки и способы оплаты.",
  alternates: { canonical: "/delivery" },
};

const payments = [
  {
    Icon: CreditCard,
    title: "Картой онлайн",
    text: "На защищённой странице платёжного сервиса. Данные карты мы не видим и не храним.",
  },
  { Icon: QrCode, title: "СБП", text: "Оплата через приложение вашего банка за пару касаний." },
  { Icon: CreditCard, title: "Картой при получении", text: "У курьера есть терминал, в ресторане — тоже." },
  { Icon: Banknote, title: "Наличными", text: "Напишите в комментарии, с какой суммы подготовить сдачу." },
];

async function DeliveryContent() {
  await connection();
  const [settings, zones] = await Promise.all([getSettings(), getZones()]);
  const active = zones.filter((z) => z.isActive);
  const orderHours = formatWeekHours(settings.orderHours);

  return (
    <div className="flex flex-col gap-8 md:gap-12">
      <section aria-labelledby="zones-title" className="grid items-start gap-4 md:grid-cols-[6fr_5fr] md:gap-6">
        <ZonesMap
          zones={zones}
          center={{ lat: settings.lat, lng: settings.lng }}
          label="Схема зон доставки вокруг ресторана"
        />
        <div className="flex flex-col gap-3">
          <h2 id="zones-title" className="font-display text-h2 text-fg">
            Зоны и стоимость
          </h2>
          <ul className="flex flex-col gap-2">
            {active.map((z) => (
              <li key={z.id} className="flex gap-1.5 rounded-card border border-line bg-surface p-2">
                {/* Цвет зоны — данные из админ-панели (как на карте), а не цвет интерфейса. */}
                <svg viewBox="0 0 16 16" className="mt-1 size-2 shrink-0" aria-hidden="true">
                  <circle cx="8" cy="8" r="8" fill={z.color} />
                </svg>
                <div className="flex flex-1 flex-col gap-0.5">
                  <p className="text-title font-semibold text-fg">{z.name}</p>
                  <p className="text-sm text-fg-muted">
                    Доставка {z.fee ? formatRub(z.fee) : "бесплатно"}
                    {z.freeFrom ? ` · бесплатно от ${formatRub(z.freeFrom)}` : ""}
                  </p>
                  <p className="text-sm text-fg-muted">
                    Заказ от {formatRub(z.minOrder)} · привезём за ≈ {z.etaMinutes} мин
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-sm text-fg-muted">
            Точную зону покажем при оформлении: начните вводить адрес — стоимость и время появятся сразу. Если адрес за
            границей зон, заберите заказ сами.
          </p>
        </div>
      </section>

      <section aria-labelledby="time-title" className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-card border border-line bg-surface p-3">
          <h2 id="time-title" className="flex items-center gap-1 text-h3 font-semibold text-fg">
            <Clock className="size-2.5 text-ginger" aria-hidden="true" />
            Когда принимаем заказы
          </h2>
          <ul className="flex flex-col text-base text-fg">
            {orderHours.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <p className="text-sm text-fg-muted">
            Вне этого времени можно оформить заказ ко времени — на сегодня или завтра. Шаг —{" "}
            {settings.scheduleStepMinutes} минут.
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-card border border-line bg-surface p-3">
          <h2 className="flex items-center gap-1 text-h3 font-semibold text-fg">
            <Store className="size-2.5 text-ginger" aria-hidden="true" />
            Самовывоз
          </h2>
          <p className="text-base text-fg">{settings.addressFull}</p>
          <p className="text-sm text-fg-muted">
            м. {settings.metro}. Приготовим за ≈ {settings.pickupMinutes} минут.
          </p>
        </div>
      </section>

      <section aria-labelledby="pay-title" className="flex flex-col gap-3">
        <h2 id="pay-title" className="font-display text-h2 text-fg">
          Способы оплаты
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {payments.map(({ Icon, title, text }) => (
            <li key={title} className="flex flex-col gap-1 rounded-card border border-line bg-surface p-2">
              <Icon className="size-3 text-ginger" aria-hidden="true" />
              <p className="text-title font-semibold text-fg">{title}</p>
              <p className="text-sm text-fg-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function DeliveryPage() {
  return (
    <div className="mx-auto flex max-w-site flex-col gap-4 px-2 py-4 md:gap-6 md:px-3 md:py-8">
      <SectionHeading
        as="h1"
        eyebrow="Доставка и оплата"
        title="Привезём горячим"
        lead="Готовим сразу после заказа и упаковываем так, чтобы рамен не остыл, а вок не размок."
      />
      <div>
        <ButtonLink href="/menu" size="lg" icon={<Truck className="size-2.5" aria-hidden="true" />}>
          Заказать доставку
        </ButtonLink>
      </div>
      <Suspense
        fallback={<div className="aspect-4/3 animate-pulse rounded-card bg-surface md:aspect-16/9" aria-busy="true" />}
      >
        <DeliveryContent />
      </Suspense>
    </div>
  );
}
