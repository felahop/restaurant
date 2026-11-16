"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { CircleAlert, Clock, MoonStar, ShoppingBag, Store, Trash2, Truck } from "lucide-react";
import { DishImage } from "@/components/site/DishImage";
import { Button, IconButton } from "@/components/ui/Button";
import { Checkbox, Radio, SegmentedControl } from "@/components/ui/Choice";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input, Select, TextareaField, TextField } from "@/components/ui/Input";
import { PhoneField } from "@/components/ui/PhoneField";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { cart, useCart } from "@/lib/cart/store";
import { cn } from "@/lib/cn";
import { formatRub, plural } from "@/lib/money";
import type { Issue, QuoteResult } from "@/lib/order/calc";
import type { PaymentMethodValue } from "@/lib/order/schemas";
import { toE164 } from "@/lib/phone";
import { AddressField, EMPTY_ADDRESS, type AddressState } from "./AddressField";

type ScheduleInfo = {
  ordersPaused: boolean;
  isOpenNow: boolean;
  asapAvailable: boolean;
  nextOpeningLabel: string | null;
  slots: { value: string; label: string }[];
  pickupMinutes: number;
  etaFrom: number;
  etaTo: number;
};

type QuoteResponse = { quote: QuoteResult; schedule: ScheduleInfo };

type Restaurant = { addressShort: string; metro: string; phoneDisplay: string; phoneE164: string };

type SavedAddressOption = {
  id: string;
  text: string;
  token: string;
  zone: AddressState["zone"];
  apartment: string | null;
  entrance: string | null;
  floor: string | null;
  intercom: string | null;
};

/** Вошедший гость: контакты, сохранённые адреса и бонусы. */
export type CheckoutAccount = {
  name: string;
  phone: string;
  email: string;
  bonusBalance: number;
  bonusEarnPercent: number;
  addresses: SavedAddressOption[];
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CONTACTS_KEY = "sumibi.contacts.v1";

/** Контакты прошлого заказа: подставляем, чтобы не вводить заново. */
function savedContacts(): { name: string; phone: string } {
  if (typeof window === "undefined") return { name: "", phone: "" };
  try {
    const saved = JSON.parse(window.localStorage.getItem(CONTACTS_KEY) ?? "null") as {
      name?: string;
      phone?: string;
    } | null;
    return { name: saved?.name ?? "", phone: saved?.phone ?? "" };
  } catch {
    return { name: "", phone: "" };
  }
}

const subscribeNoop = () => () => {};
/** true только в браузере после гидратации: корзина живёт в localStorage. */
function useIsClient() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

function Section({ title, icon, children, id }: { title: string; icon?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 rounded-card border border-line bg-surface p-2 md:p-3">
      <h2 id={id} className="flex items-center gap-1 text-h3 font-semibold text-fg">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function SummaryRow({
  label,
  value,
  strong,
  accent,
}: {
  label: ReactNode;
  value: ReactNode;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-2",
        strong ? "text-title font-semibold text-fg" : "text-base text-fg-muted",
      )}
    >
      <dt>{label}</dt>
      <dd className={cn("tabular-nums", accent && "text-success")}>{value}</dd>
    </div>
  );
}

export function Checkout({
  restaurant,
  account = null,
  receiptEmailRequired = false,
}: {
  restaurant: Restaurant;
  account?: CheckoutAccount | null;
  /** Чеки через ЮKassa: для онлайн-оплаты нужна почта покупателя. */
  receiptEmailRequired?: boolean;
}) {
  const isClient = useIsClient();
  const router = useRouter();
  const { state, count } = useCart();

  const [type, setType] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [address, setAddress] = useState<AddressState>(EMPTY_ADDRESS);
  const [details, setDetails] = useState({ apartment: "", entrance: "", floor: "", intercom: "" });
  const [whenKind, setWhenKind] = useState<"asap" | "slot">("asap");
  const [slot, setSlot] = useState("");
  const [name, setName] = useState(() => account?.name || savedContacts().name);
  const [phone, setPhone] = useState(() => account?.phone || savedContacts().phone);
  const [email, setEmail] = useState(account?.email ?? "");
  const [useBonus, setUseBonus] = useState(false);
  const [savedAddressId, setSavedAddressId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [cutlery, setCutlery] = useState(1);
  const [payment, setPayment] = useState<PaymentMethodValue>("CARD_ONLINE");
  const [promoInput, setPromoInput] = useState("");
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [data, setData] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const items = useMemo(
    () => state.lines.map((l) => ({ dishId: l.dishId, modifierIds: l.modifiers.map((m) => m.id), qty: l.qty })),
    [state.lines],
  );
  const addressToken = type === "DELIVERY" ? address.token : null;
  const quoteKey = JSON.stringify({ items, type, addressToken, promoCode, useBonus });

  // Пересчёт на сервере при любом изменении корзины, способа получения, адреса или промокода.
  useEffect(() => {
    if (!isClient) return;
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const res = await fetch("/api/checkout/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: quoteKey,
          signal: ctrl.signal,
        });
        const body = (await res.json()) as QuoteResponse & { error?: string; code?: string };
        if (!res.ok) {
          if (body.code === "ADDRESS_EXPIRED")
            setAddress({ ...EMPTY_ADDRESS, error: body.error ?? "Выберите адрес ещё раз" });
          setQuoteError(body.error ?? "Не получилось пересчитать заказ");
          return;
        }
        setData(body);
        setQuoteError(null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setQuoteError("Нет связи. Проверьте интернет — корзина на месте.");
      } finally {
        if (!ctrl.signal.aborted) setQuoteLoading(false);
      }
    }, 250);
    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [quoteKey, isClient]);

  const quote = data?.quote ?? null;
  const schedule = data?.schedule ?? null;

  // Вне часов работы — только ко времени; выбранный слот должен быть среди доступных.
  const effectiveWhen: "asap" | "slot" = schedule && !schedule.asapAvailable ? "slot" : whenKind;
  const effectiveSlot = schedule?.slots.some((s) => s.value === slot) ? slot : (schedule?.slots[0]?.value ?? "");

  if (!isClient) {
    return (
      <div
        className="mx-auto h-60 max-w-site animate-pulse rounded-card bg-surface"
        aria-busy="true"
        aria-label="Загружаем корзину"
      />
    );
  }

  if (count === 0) {
    return (
      <div className="mx-auto max-w-site px-2 pb-6 md:px-3">
        <EmptyState
          icon={<ShoppingBag className="size-3" aria-hidden="true" />}
          title="В корзине пока пусто"
          action={
            <Link
              href="/menu"
              className="inline-flex h-6 items-center rounded-full bg-action px-3 font-semibold text-on-action hover:bg-action-hover"
            >
              Выбрать блюда
            </Link>
          }
        >
          Загляните в меню: рамен, вок и бао уже ждут.
        </EmptyState>
      </div>
    );
  }

  if (schedule?.ordersPaused) {
    return (
      <div className="mx-auto max-w-site px-2 pb-6 md:px-3">
        <EmptyState icon={<MoonStar className="size-3" aria-hidden="true" />} title="Мы временно не принимаем заказы">
          Кухня перегружена или закрыта. Позвоните нам:{" "}
          <a className="font-semibold text-fg underline" href={`tel:${restaurant.phoneE164}`}>
            {restaurant.phoneDisplay}
          </a>
          . Корзина сохранится.
        </EmptyState>
      </div>
    );
  }

  const issuesByItem = new Map<number, Issue>();
  quote?.issues.forEach((i) => i.itemIndex != null && issuesByItem.set(i.itemIndex, i));
  const generalIssues =
    quote?.issues.filter((i) => i.itemIndex == null && i.code !== "ADDRESS_REQUIRED" && i.code !== "OUT_OF_ZONE") ?? [];
  const online = payment === "CARD_ONLINE" || payment === "SBP";
  const etaLabel =
    type === "PICKUP"
      ? `через ${schedule?.pickupMinutes ?? 25} мин`
      : address.zone
        ? `≈ ${address.zone.etaMinutes} мин`
        : `${schedule?.etaFrom ?? 35}–${schedule?.etaTo ?? 60} мин`;

  const validate = () => {
    const next: Record<string, string> = {};
    if (type === "DELIVERY" && !address.token) next.address = "Выберите адрес из подсказок";
    if (type === "DELIVERY" && address.outOfZone) next.address = "Сюда пока не доставляем — выберите самовывоз";
    if (effectiveWhen === "slot" && !effectiveSlot) next.slot = "Выберите время";
    if (!name.trim()) next.name = "Как к вам обращаться?";
    if (!toE164(phone)) next.phone = "Нужно 10 цифр после +7";
    if (!consent) next.consent = "Нужно ваше согласие";
    if ((payment === "CARD_ONLINE" || payment === "SBP") && receiptEmailRequired && !EMAIL_RE.test(email.trim()))
      next.email = "Укажите почту — пришлём на неё чек";
    setErrors(next);
    return next;
  };

  const submit = async () => {
    // Пока нет первого расчёта, неизвестно, работает ли кухня: «как можно скорее» могло бы уйти в закрытые часы.
    if (!schedule && !quoteError) return;
    setSubmitError(null);
    const errs = validate();
    if (Object.keys(errs).length) {
      const first = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
      first?.focus();
      return;
    }
    // Окончательную проверку делает сервер: локальный расчёт мог устареть, пока пересчитывался.
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          type,
          addressToken,
          promoCode,
          addressDetails: type === "DELIVERY" ? details : undefined,
          when: effectiveWhen === "asap" ? { kind: "asap" } : { kind: "slot", slot: effectiveSlot },
          customer: { name, phone, comment, cutlery, email: email.trim() || undefined },
          useBonus,
          payment,
          consent,
        }),
      });
      const body = (await res.json()) as { token?: string; error?: string; paymentUrl?: string };
      if (!res.ok || !body.token) {
        setSubmitError(body.error ?? "Не получилось оформить заказ. Попробуйте ещё раз.");
        return;
      }
      try {
        window.localStorage.setItem(CONTACTS_KEY, JSON.stringify({ name, phone }));
      } catch {
        // не страшно
      }
      cart.clear();
      // Онлайн-оплата: уходим на страницу платёжного сервиса; данные карты вводятся только там.
      if (body.paymentUrl) window.location.assign(body.paymentUrl);
      else router.push(`/order/${body.token}`);
    } catch {
      setSubmitError("Нет связи. Проверьте интернет и нажмите ещё раз — заказ не создан.");
    } finally {
      setSubmitting(false);
    }
  };

  const total = quote?.total;
  const submitLabel =
    total == null ? "Оформить заказ" : `${online ? "Перейти к оплате" : "Оформить заказ"} · ${formatRub(total)}`;

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="mx-auto max-w-site px-2 pb-12 md:px-3 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-4 lg:pb-6"
    >
      <div className="flex flex-col gap-2 md:gap-3">
        {/* ---------- Корзина ---------- */}
        <Section id="cart-title" title={`Корзина · ${count} ${plural(count, ["блюдо", "блюда", "блюд"])}`}>
          <ul className="flex flex-col divide-y divide-line">
            {state.lines.map((line, index) => {
              const issue = issuesByItem.get(index);
              return (
                <li key={line.key} className="flex gap-1.5 py-2 first:pt-0 last:pb-0">
                  <DishImage
                    name={line.name}
                    imageUrl={line.imageUrl}
                    kanji={line.kanji}
                    className="w-10 shrink-0 self-start rounded-sm"
                    sizes="80px"
                    compact
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-1">
                      <Link href={`/menu/${line.slug}`} className="text-base font-semibold text-fg hover:underline">
                        {line.name}
                      </Link>
                      <IconButton
                        label={`Удалить: ${line.name}`}
                        className="-mt-1 -mr-1 shrink-0"
                        onClick={() => cart.remove(line.key)}
                      >
                        <Trash2 className="size-2" aria-hidden="true" />
                      </IconButton>
                    </div>
                    {line.modifiers.length ? (
                      <p className="text-sm text-fg-muted">{line.modifiers.map((m) => m.name).join(", ")}</p>
                    ) : null}
                    {issue ? (
                      <p className="flex items-start gap-1 text-sm text-accent" role="alert">
                        <CircleAlert className="mt-px size-2 shrink-0" aria-hidden="true" />
                        {issue.message}
                      </p>
                    ) : null}
                    <div className="flex items-center justify-between gap-1">
                      <QuantityStepper
                        value={line.qty}
                        min={1}
                        onChange={(n) => cart.setQty(line.key, n)}
                        itemName={line.name}
                      />
                      <span className="text-base font-semibold text-fg tabular-nums">
                        {formatRub(line.unitPrice * line.qty)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <Link href="/menu" className="self-start text-sm font-semibold text-fg underline-offset-4 hover:underline">
            + Добавить ещё блюд
          </Link>
        </Section>

        {/* ---------- Получение ---------- */}
        <Section id="receive-title" title="Получение">
          <SegmentedControl
            name="order-type"
            legend="Способ получения"
            value={type}
            onChange={(v) => {
              setType(v);
              setErrors((e) => ({ ...e, address: "" }));
            }}
            options={[
              {
                value: "DELIVERY",
                label: (
                  <span className="inline-flex items-center gap-1">
                    <Truck className="size-2" aria-hidden="true" />
                    Доставка
                  </span>
                ),
              },
              {
                value: "PICKUP",
                label: (
                  <span className="inline-flex items-center gap-1">
                    <Store className="size-2" aria-hidden="true" />
                    Самовывоз
                  </span>
                ),
              },
            ]}
          />

          {type === "DELIVERY" ? (
            <div className="flex flex-col gap-2">
              {account?.addresses.length ? (
                <fieldset className="flex min-w-0 flex-col gap-1">
                  <legend className="mb-0.5 text-sm font-medium text-fg">Мои адреса</legend>
                  <div className="flex flex-wrap gap-1">
                    {account.addresses.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        aria-pressed={savedAddressId === a.id}
                        onClick={() => {
                          setSavedAddressId(a.id);
                          setAddress({ text: a.text, token: a.token, zone: a.zone, error: null, outOfZone: !a.zone });
                          setDetails({
                            apartment: a.apartment ?? "",
                            entrance: a.entrance ?? "",
                            floor: a.floor ?? "",
                            intercom: a.intercom ?? "",
                          });
                          setErrors((e) => ({ ...e, address: "" }));
                        }}
                        className={cn(
                          "inline-flex min-h-5.5 max-w-full items-center rounded-full border px-1.5 text-left text-sm transition-colors duration-150",
                          savedAddressId === a.id
                            ? "border-fg bg-fg font-semibold text-canvas"
                            : "border-line-strong text-fg hover:border-fg",
                        )}
                      >
                        <span className="truncate">{a.text}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : null}
              <AddressField
                value={address}
                onChange={(a) => {
                  setAddress(a);
                  setSavedAddressId(null);
                  setErrors((e) => ({ ...e, address: "" }));
                }}
                error={errors.address || null}
              />
              {address.zone ? (
                <p className="rounded-field bg-surface-2 px-2 py-1 text-sm text-fg" role="status">
                  Зона «{address.zone.name}»: доставка {address.zone.fee ? formatRub(address.zone.fee) : "бесплатно"}
                  {address.zone.freeFrom ? `, бесплатно от ${formatRub(address.zone.freeFrom)}` : ""} · привезём за ≈{" "}
                  {address.zone.etaMinutes} мин
                </p>
              ) : null}
              {address.outOfZone ? (
                <div className="flex flex-col gap-1.5 rounded-field border border-cinnabar p-2" role="alert">
                  <p className="text-base font-semibold text-fg">Сюда пока не доставляем</p>
                  <p className="text-sm text-fg-muted">
                    Адрес за границей наших зон. Заберите заказ сами — приготовим к вашему приходу,{" "}
                    {restaurant.addressShort}.
                  </p>
                  <Button variant="secondary" size="sm" className="self-start" onClick={() => setType("PICKUP")}>
                    Заберу сам
                  </Button>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {(
                  [
                    ["apartment", "Квартира"],
                    ["entrance", "Подъезд"],
                    ["floor", "Этаж"],
                    ["intercom", "Домофон"],
                  ] as const
                ).map(([key, label]) => (
                  <TextField
                    key={key}
                    id={`addr-${key}`}
                    label={label}
                    value={details[key]}
                    maxLength={20}
                    onChange={(e) => setDetails((d) => ({ ...d, [key]: e.target.value }))}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="flex items-start gap-1 text-base text-fg">
              <Store className="mt-0.5 size-2.5 shrink-0 text-ginger" aria-hidden="true" />
              <span>
                {restaurant.addressShort}
                <span className="block text-sm text-fg-muted">
                  м. {restaurant.metro} · будет готово {etaLabel}
                </span>
              </span>
            </p>
          )}

          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 flex items-center gap-1 text-sm font-medium text-fg">
              <Clock className="size-2 text-ginger" aria-hidden="true" />
              Когда
            </legend>
            {schedule && !schedule.asapAvailable ? (
              <p
                className="mb-1 flex items-start gap-1 rounded-field bg-surface-2 px-2 py-1 text-sm text-fg"
                role="status"
              >
                <MoonStar className="mt-px size-2 shrink-0 text-ginger" aria-hidden="true" />
                Кухня отдыхает{schedule.nextOpeningLabel ? ` — откроемся ${schedule.nextOpeningLabel}` : ""}. Сейчас
                можно оформить заказ ко времени.
              </p>
            ) : null}
            <Radio
              name="when"
              label={`Как можно скорее · ${etaLabel}`}
              checked={effectiveWhen === "asap"}
              disabled={!schedule?.asapAvailable}
              onChange={() => setWhenKind("asap")}
            />
            <Radio
              name="when"
              label="Ко времени"
              checked={effectiveWhen === "slot"}
              onChange={() => setWhenKind("slot")}
            />
            {effectiveWhen === "slot" ? (
              <Field id="slot" label="Время" error={errors.slot} className="pl-4.5">
                {(a11y) => (
                  <Select {...a11y} value={effectiveSlot} onChange={(e) => setSlot(e.target.value)}>
                    {schedule?.slots.length ? null : <option value="">Нет свободного времени</option>}
                    {schedule?.slots.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : null}
          </fieldset>
        </Section>

        {/* ---------- Контакты ---------- */}
        <Section id="contacts-title" title="Контакты">
          <div className="grid gap-2 sm:grid-cols-2">
            <TextField
              id="name"
              label="Имя"
              autoComplete="given-name"
              value={name}
              maxLength={60}
              error={errors.name}
              onChange={(e) => setName(e.target.value)}
            />
            <PhoneField
              id="phone"
              defaultValue={phone}
              error={errors.phone}
              hint="Позвоним, только если что-то пойдёт не так"
              onValueChange={setPhone}
            />
          </div>
          <TextareaField
            id="comment"
            label="Комментарий"
            optional
            rows={2}
            maxLength={500}
            placeholder="Например: без кинзы, позвонить за 5 минут"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex items-center justify-between gap-2">
            <span id="cutlery-label" className="text-base text-fg">
              Приборы
            </span>
            <QuantityStepper value={cutlery} min={0} max={20} onChange={setCutlery} itemName="приборы" />
          </div>
        </Section>

        {/* ---------- Оплата ---------- */}
        <Section id="payment-title" title="Оплата">
          <fieldset className="flex flex-col">
            <legend className="sr-only">Способ оплаты</legend>
            <Radio
              name="payment"
              label="Картой онлайн"
              description="На защищённой странице платёжного сервиса"
              checked={payment === "CARD_ONLINE"}
              onChange={() => setPayment("CARD_ONLINE")}
            />
            <Radio
              name="payment"
              label="СБП"
              description="Через приложение вашего банка"
              checked={payment === "SBP"}
              onChange={() => setPayment("SBP")}
            />
            <Radio
              name="payment"
              label={type === "DELIVERY" ? "Картой курьеру" : "Картой в ресторане"}
              checked={payment === "CARD_ON_DELIVERY"}
              onChange={() => setPayment("CARD_ON_DELIVERY")}
            />
            <Radio
              name="payment"
              label="Наличными"
              description={
                type === "DELIVERY" ? "Курьер привезёт сдачу — укажите в комментарии, с какой суммы" : undefined
              }
              checked={payment === "CASH"}
              onChange={() => setPayment("CASH")}
            />
          </fieldset>
          {receiptEmailRequired && online ? (
            <TextField
              id="email"
              label="Почта для чека"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              error={errors.email}
              hint="Электронный чек придёт на эту почту"
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((er) => ({ ...er, email: "" }));
              }}
            />
          ) : null}
        </Section>
      </div>

      {/* ---------- Итог ---------- */}
      <aside
        aria-labelledby="summary-title"
        className="mt-2 flex flex-col gap-2 rounded-card border border-line bg-surface p-2 md:mt-3 md:p-3 lg:sticky lg:top-10 lg:mt-0"
      >
        <h2 id="summary-title" className="text-h3 font-semibold text-fg">
          Итого
        </h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="promo" className="text-sm font-medium text-fg">
            Промокод
          </label>
          <div className="flex gap-1">
            <Input
              id="promo"
              value={promoInput}
              maxLength={40}
              autoCapitalize="characters"
              onChange={(e) => setPromoInput(e.target.value)}
              aria-describedby={quote?.promo ? "promo-status" : undefined}
            />
            {promoCode ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setPromoCode(null);
                  setPromoInput("");
                }}
              >
                Убрать
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => setPromoCode(promoInput.trim() || null)}
                disabled={!promoInput.trim()}
              >
                Применить
              </Button>
            )}
          </div>
          {quote?.promo ? (
            <p
              id="promo-status"
              role="status"
              className={cn("text-sm", quote.promo.applied ? "text-success" : "text-accent")}
            >
              {quote.promo.message}
            </p>
          ) : null}
          {account ? (
            account.bonusBalance > 0 ? (
              <Checkbox
                checked={useBonus}
                onChange={(e) => setUseBonus(e.target.checked)}
                label={`Списать бонусы`}
                description={
                  useBonus && quote
                    ? `Спишем ${quote.bonusSpent / 100} из ${account.bonusBalance / 100}`
                    : `Доступно ${account.bonusBalance / 100} — 1 бонус = 1 ₽`
                }
              />
            ) : (
              <p className="text-sm text-fg-muted">
                С этого заказа начислим {account.bonusEarnPercent} % бонусами — их можно списать в следующий раз.
              </p>
            )
          ) : (
            <p className="text-sm text-fg-muted">
              <Link href="/account" className="font-semibold text-fg underline-offset-4 hover:underline">
                Войдите по номеру
              </Link>
              , чтобы копить и списывать бонусы.
            </p>
          )}
        </div>

        <dl
          className={cn(
            "flex flex-col gap-1 border-t border-line pt-2 transition-opacity",
            quoteLoading && "opacity-60",
          )}
          aria-busy={quoteLoading}
        >
          <SummaryRow label="Блюда" value={quote ? formatRub(quote.subtotal) : "…"} />
          {type === "DELIVERY" ? (
            <SummaryRow
              label="Доставка"
              value={
                quote?.delivery
                  ? quote.delivery.fee
                    ? formatRub(quote.delivery.fee)
                    : "бесплатно"
                  : "после выбора адреса"
              }
              accent={quote?.delivery?.fee === 0}
            />
          ) : null}
          {quote?.discount ? (
            <SummaryRow label={`Промокод ${quote.promo?.code ?? ""}`} value={`−${formatRub(quote.discount)}`} accent />
          ) : null}
          {quote?.bonusSpent ? <SummaryRow label="Бонусами" value={`−${formatRub(quote.bonusSpent)}`} accent /> : null}
          <SummaryRow label="К оплате" value={total == null ? "…" : formatRub(total)} strong />
        </dl>

        {type === "DELIVERY" && quote?.delivery?.remainingToFree ? (
          <div className="flex flex-col gap-1" role="status">
            <p className="text-sm text-fg">
              До бесплатной доставки осталось {formatRub(quote.delivery.remainingToFree)}
            </p>
            <div className="h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
              <div
                className="h-full rounded-full bg-ginger transition-[width] duration-250"
                style={{
                  width: `${Math.min(100, Math.round((quote.subtotal / (quote.delivery.freeFrom ?? 1)) * 100))}%`,
                }}
              />
            </div>
          </div>
        ) : null}

        {generalIssues.map((i) => (
          <p key={i.code} className="flex items-start gap-1 text-sm text-accent" role="alert">
            <CircleAlert className="mt-px size-2 shrink-0" aria-hidden="true" />
            {i.message}
          </p>
        ))}
        {quoteError ? (
          <p className="text-sm text-accent" role="alert">
            {quoteError}
          </p>
        ) : null}

        <Checkbox
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked);
            setErrors((er) => ({ ...er, consent: "" }));
          }}
          aria-invalid={errors.consent ? true : undefined}
          label={
            <>
              Согласен на обработку персональных данных по{" "}
              <Link href="/privacy" className="underline underline-offset-4" target="_blank">
                политике конфиденциальности
              </Link>{" "}
              и с{" "}
              <Link href="/offer" className="underline underline-offset-4" target="_blank">
                офертой
              </Link>
            </>
          }
        />
        {errors.consent ? <p className="-mt-1 text-sm text-accent">{errors.consent}</p> : null}

        {submitError ? (
          <p className="flex items-start gap-1 rounded-field border border-cinnabar p-1.5 text-sm text-fg" role="alert">
            <CircleAlert className="mt-px size-2 shrink-0 text-accent" aria-hidden="true" />
            {submitError}
          </p>
        ) : null}

        {/* На десктопе кнопка в блоке «Итого» (он липкий); на телефоне и планшете — липкая полоса снизу. */}
        <div className="hidden lg:block">
          <Button type="submit" size="lg" block loading={submitting} disabled={!schedule && !quoteError}>
            <span className="tabular-nums">{submitLabel}</span>
          </Button>
        </div>
        {online ? (
          <p className="text-sm text-fg-muted">
            Данные карты вводятся только на странице платёжного сервиса. Мы их не видим и не храним.
          </p>
        ) : null}
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-2 pt-1 pb-[max(8px,env(safe-area-inset-bottom))] shadow-bar lg:hidden">
        <div className="mx-auto max-w-site">
          <Button type="submit" size="lg" block loading={submitting} disabled={!schedule && !quoteError}>
            <span className="tabular-nums">{submitLabel}</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
