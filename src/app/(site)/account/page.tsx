import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Gift, MapPin, Receipt, UserRound } from "lucide-react";
import { LoginForm } from "@/components/account/LoginForm";
import { DeleteAddressButton, LogoutButton, ProfileForm, RepeatOrderButton } from "@/components/account/AccountClient";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Typography";
import { formatRub, plural } from "@/lib/money";
import { formatPhoneInput } from "@/lib/phone";
import { statusLabel } from "@/lib/order/status";
import { userAddresses, userBonusHistory, userOrders } from "@/server/account";
import { getUser } from "@/server/auth/user";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: "Личный кабинет",
  robots: { index: false, follow: false },
};

const BONUS_LABELS = { EARN: "Начислено", SPEND: "Списано", REFUND: "Возвращено", ADJUST: "Корректировка" } as const;

function Section({ id, title, Icon, children }: { id: string; title: string; Icon: typeof Gift; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 rounded-card border border-line bg-surface p-2 md:p-3">
      <h2 id={id} className="flex items-center gap-1 text-title font-semibold text-fg">
        <Icon className="size-2.5 text-ginger" aria-hidden="true" />
        {title}
      </h2>
      {children}
    </section>
  );
}

async function AccountContent() {
  const user = await getUser();
  if (!user) return <LoginForm />;
  const [orders, bonuses, addresses, settings] = await Promise.all([
    userOrders(user.id),
    userBonusHistory(user.id),
    userAddresses(user.id),
    getSettings(),
  ]);
  const date = new Intl.DateTimeFormat("ru-RU", { timeZone: settings.timezone, day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const short = new Intl.DateTimeFormat("ru-RU", { timeZone: settings.timezone, day: "numeric", month: "short" });

  return (
    <div className="grid items-start gap-2 lg:grid-cols-[7fr_5fr] lg:gap-3">
      <div className="flex min-w-0 flex-col gap-2 lg:gap-3">
        <Section id="orders-title" title="Заказы" Icon={Receipt}>
          {orders.length === 0 ? (
            <div className="flex flex-col items-start gap-1.5">
              <p className="text-base text-fg-muted">Заказов пока нет. Самое время попробовать рамен.</p>
              <ButtonLink href="/menu">Открыть меню</ButtonLink>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {orders.map((o) => {
                const items = o.items.map((i) => (i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name)).join(", ");
                return (
                  <li key={o.id} className="flex flex-col gap-1 py-1.5 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-1">
                      <Link href={`/order/${o.publicToken}`} className="text-base font-semibold text-fg underline-offset-4 hover:underline">
                        №{o.number} · {date.format(o.createdAt)}
                      </Link>
                      <span className="font-semibold text-fg tabular-nums">{formatRub(o.total)}</span>
                    </div>
                    <p className="line-clamp-2 text-sm text-fg-muted">{items}</p>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge tone={o.status === "COMPLETED" ? "success" : o.status === "CANCELED" ? "soldOut" : "neutral"}>
                        {statusLabel(o.status, o.type)}
                      </Badge>
                      {o.bonusEarned > 0 ? <span className="text-xs text-fg-muted">+{o.bonusEarned / 100} бонусов</span> : null}
                      <div className="ml-auto flex flex-wrap items-start gap-1">
                        {o.status === "COMPLETED" && !o.review ? (
                          <Link
                            href={`/order/${o.publicToken}#review`}
                            className="inline-flex min-h-5.5 items-center px-1 text-sm font-semibold text-fg underline-offset-4 hover:underline"
                          >
                            Оставить отзыв
                          </Link>
                        ) : null}
                        <RepeatOrderButton orderId={o.id} number={o.number} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>

      <div className="flex min-w-0 flex-col gap-2 lg:gap-3">
        <Section id="bonus-title" title="Бонусы" Icon={Gift}>
          <p className="font-display text-h2 text-fg tabular-nums">
            {user.bonusBalance / 100} <span className="text-lead">{plural(user.bonusBalance / 100, ["бонус", "бонуса", "бонусов"])}</span>
          </p>
          <p className="text-sm text-fg-muted">
            1 бонус = 1 ₽. Начисляем {settings.bonusEarnPercent} % от оплаченного заказа, списать можно до{" "}
            {settings.bonusMaxSpendPercent} % стоимости блюд — при оформлении.
          </p>
          {bonuses.length ? (
            <ul className="flex flex-col gap-0.5 text-sm">
              {bonuses.map((b) => (
                <li key={b.id} className="flex justify-between gap-1">
                  <span className="text-fg-muted">
                    {short.format(b.createdAt)} · {BONUS_LABELS[b.type]}
                    {b.comment ? ` · ${b.comment}` : ""}
                  </span>
                  <span className="font-semibold text-fg tabular-nums">
                    {b.amount > 0 ? "+" : "−"}
                    {Math.abs(b.amount) / 100}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>

        <Section id="addresses-title" title="Адреса" Icon={MapPin}>
          {addresses.length === 0 ? (
            <p className="text-sm text-fg-muted">Адрес сохранится сам после первого заказа с доставкой.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {addresses.map((a) => (
                <li key={a.id} className="flex items-start gap-1 py-1 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-base text-fg">{a.text}</span>
                    <span className="text-sm text-fg-muted">
                      {[a.apartment && `кв. ${a.apartment}`, a.entrance && `подъезд ${a.entrance}`, a.floor && `этаж ${a.floor}`]
                        .filter(Boolean)
                        .join(", ") || (a.zone ? a.zone.name : "Вне зоны доставки")}
                    </span>
                  </div>
                  <DeleteAddressButton id={a.id} text={a.text} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section id="profile-title" title="Профиль" Icon={UserRound}>
          <p className="text-sm text-fg-muted">
            Телефон: <span className="font-semibold whitespace-nowrap text-fg tabular-nums">{formatPhoneInput(user.phone)}</span>
          </p>
          <ProfileForm name={user.name ?? ""} email={user.email ?? ""} />
          <div className="border-t border-line pt-1">
            <LogoutButton />
          </div>
        </Section>
      </div>
    </div>
  );
}

function AccountSkeleton() {
  return <div className="h-60 animate-pulse rounded-card bg-surface" aria-busy="true" aria-label="Загружаем кабинет" />;
}

export default function AccountPage() {
  return (
    <div className="mx-auto flex max-w-site flex-col gap-3 px-2 pt-3 pb-8 md:px-3 md:pt-6 md:pb-12">
      <header className="flex flex-col gap-1">
        <Eyebrow>Заказы, адреса, бонусы</Eyebrow>
        <h1 className="font-display text-h1 text-fg">Личный кабинет</h1>
      </header>
      <Suspense fallback={<AccountSkeleton />}>
        <AccountContent />
      </Suspense>
    </div>
  );
}
