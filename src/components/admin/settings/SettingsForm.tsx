"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { TextareaField, TextField } from "@/components/ui/Input";
import type { WeekHoursInput } from "@/lib/admin/hours";
import { saveSettingsAction, type SettingsInput } from "@/app/admin/(panel)/settings/actions";
import { WeekHoursEditor } from "./WeekHoursEditor";

export type SettingsFormValues = Omit<SettingsInput, "lat" | "lng" | "etaFromMin" | "etaToMin" | "pickupMinutes" | "bonusEarnPercent" | "bonusMaxSpendPercent" | "scheduleStepMinutes" | "scheduleLeadMinutes" | "scheduleDaysAhead" | "openingHours" | "topBarItems"> & {
  lat: string;
  lng: string;
  etaFromMin: string;
  etaToMin: string;
  pickupMinutes: string;
  bonusEarnPercent: string;
  bonusMaxSpendPercent: string;
  scheduleStepMinutes: string;
  scheduleLeadMinutes: string;
  scheduleDaysAhead: string;
  openingHours: WeekHoursInput;
  topBarItems: string[];
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-2 md:p-3">
      <h2 className="text-title font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function SettingsForm({ initial }: { initial: SettingsFormValues }) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof SettingsFormValues>(k: K, value: SettingsFormValues[K]) => setV((p) => ({ ...p, [k]: value }));
  const text = (k: keyof SettingsFormValues, label: string, extra: Partial<React.ComponentProps<typeof TextField>> = {}) => (
    <TextField id={`s-${String(k)}`} label={label} value={String(v[k] ?? "")} error={errors[String(k)]} onChange={(e) => set(k, e.target.value as never)} {...extra} />
  );
  const n = (s: string) => Number(s.replace(",", "."));

  const save = () =>
    start(async () => {
      const res = await saveSettingsAction({
        ...v,
        lat: n(v.lat),
        lng: n(v.lng),
        etaFromMin: n(v.etaFromMin),
        etaToMin: n(v.etaToMin),
        pickupMinutes: n(v.pickupMinutes),
        bonusEarnPercent: n(v.bonusEarnPercent),
        bonusMaxSpendPercent: n(v.bonusMaxSpendPercent),
        scheduleStepMinutes: n(v.scheduleStepMinutes),
        scheduleLeadMinutes: n(v.scheduleLeadMinutes),
        scheduleDaysAhead: n(v.scheduleDaysAhead),
        topBarItems: v.topBarItems.map((t) => t.trim()).filter(Boolean),
      });
      setErrors(res.ok ? {} : (res.fields ?? {}));
      setMessage({ ok: res.ok, text: res.ok ? (res.message ?? "Сохранено") : res.error });
    });

  return (
    <form
      noValidate
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Section title="Ресторан">
        <div className="grid gap-2 md:grid-cols-2">
          {text("name", "Название")}
          {text("tagline", "Подзаголовок")}
          {text("legalName", "Юрлицо (для подвала и оферты)")}
          {text("city", "Город")}
        </div>
        <TextareaField id="s-description" label="Описание (подвал, поиск)" rows={2} value={v.description} onChange={(e) => set("description", e.target.value)} />
      </Section>

      <Section title="Адрес и как добраться">
        <div className="grid gap-2 md:grid-cols-2">
          {text("addressFull", "Полный адрес")}
          {text("addressShort", "Короткий адрес")}
          {text("metro", "Метро / ориентир")}
          {text("timezone", "Часовой пояс", { hint: "Например Europe/Moscow или Asia/Almaty" })}
          {text("lat", "Широта", { inputMode: "decimal" })}
          {text("lng", "Долгота", { inputMode: "decimal" })}
        </div>
        <TextareaField id="s-parking" label="Парковка" rows={2} value={v.parking} onChange={(e) => set("parking", e.target.value)} />
      </Section>

      <Section title="Контакты">
        <div className="grid gap-2 md:grid-cols-2">
          {text("phoneDisplay", "Телефон", { hint: "Как показывать: +7 (495) 000-00-00" })}
          {text("email", "Почта")}
          {text("telegramUrl", "Telegram", { placeholder: "https://t.me/…" })}
          {text("whatsappUrl", "WhatsApp", { placeholder: "https://wa.me/…" })}
          {text("vkUrl", "ВКонтакте", { placeholder: "https://vk.com/…" })}
        </div>
      </Section>

      <Section title="Часы работы зала">
        <WeekHoursEditor idPrefix="open" value={v.openingHours} onChange={(h) => set("openingHours", h)} />
        <p className="text-sm text-fg-muted">Часы приёма заказов на доставку настраиваются в разделе «Доставка».</p>
      </Section>

      <Section title="Плашка над шапкой">
        <p className="text-sm text-fg-muted">
          На телефоне виден первый пункт. Суммы и сроки («2 500 ₽», «35–60 мин») выделяются жирным, значок подбирается по смыслу.
        </p>
        {[0, 1, 2, 3].map((i) => (
          <TextField
            key={i}
            id={`s-topbar-${i}`}
            label={`Пункт ${i + 1}${["", " (с ширины планшета)", " (только на компьютере)", " (только на компьютере)"][i]}`}
            optional={i > 0}
            maxLength={60}
            value={v.topBarItems[i] ?? ""}
            onChange={(e) => {
              const next = [...v.topBarItems];
              next[i] = e.target.value;
              set("topBarItems", next);
            }}
          />
        ))}
      </Section>

      <Section title="Время, бонусы, заказ ко времени">
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {text("etaFromMin", "Доставка от, мин", { inputMode: "numeric" })}
          {text("etaToMin", "Доставка до, мин", { inputMode: "numeric" })}
          {text("pickupMinutes", "Самовывоз готов через, мин", { inputMode: "numeric" })}
          {text("bonusEarnPercent", "Начисляем бонусами, %", { inputMode: "numeric" })}
          {text("bonusMaxSpendPercent", "Можно оплатить бонусами, % суммы", { inputMode: "numeric" })}
          {text("scheduleStepMinutes", "Шаг «ко времени», мин", { inputMode: "numeric" })}
          {text("scheduleLeadMinutes", "Ближайшее «ко времени» через, мин", { inputMode: "numeric" })}
          {text("scheduleDaysAhead", "Дней вперёд для заказа", { inputMode: "numeric" })}
        </div>
      </Section>

      <div className="sticky bottom-0 z-10 flex items-center justify-end gap-1.5 rounded-card border border-line bg-surface p-2 shadow-soft">
        {message ? (
          <p role="status" className={message.ok ? "text-sm text-success" : "text-sm text-accent"}>
            {message.text}
          </p>
        ) : null}
        <Button type="submit" loading={pending}>
          Сохранить настройки
        </Button>
      </div>
    </form>
  );
}
