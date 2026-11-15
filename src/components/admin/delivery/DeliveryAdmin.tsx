"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select, TextareaField, TextField } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import type { WeekHoursInput } from "@/lib/admin/hours";
import { palette } from "@/design/tokens";
import { formatRub } from "@/lib/money";
import { deleteZoneAction, saveOrderHoursAction, saveZoneAction, setOrdersPausedAction } from "@/app/admin/(panel)/delivery/actions";
import { WeekHoursEditor } from "@/components/admin/settings/WeekHoursEditor";
import { ZonePolygonEditor } from "./ZonePolygonEditor";

type Zone = {
  id: string;
  name: string;
  color: string;
  fee: number;
  minOrder: number;
  freeFrom: number | null;
  etaMinutes: number;
  isActive: boolean;
  sortOrder: number;
  polygon: [number, number][];
};

/** Цвета зон на схеме — из палитры сайта. */
const COLORS = [
  [palette.ginger, "Имбирь"],
  [palette.matcha, "Матча"],
  [palette.sesame, "Кунжут"],
  [palette["cinnabar-deep"], "Киноварь"],
  [palette.stone, "Камень"],
] as const;

function ZoneCard({ zone, others, center, onDone }: { zone: Zone | null; others: Zone[]; center: { lat: number; lng: number }; onDone: () => void }) {
  const [v, setV] = useState({
    name: zone?.name ?? "",
    color: zone?.color ?? palette.ginger,
    fee: zone ? String(zone.fee / 100) : "0",
    minOrder: zone ? String(zone.minOrder / 100) : "900",
    freeFrom: zone?.freeFrom != null ? String(zone.freeFrom / 100) : "",
    etaMinutes: String(zone?.etaMinutes ?? 45),
    isActive: zone?.isActive ?? true,
    sortOrder: String(zone?.sortOrder ?? (others.length + 1) * 10),
    polygon: zone?.polygon ?? [],
  });
  const [coordsText, setCoordsText] = useState(() => (zone?.polygon ?? []).map((p) => p.join(", ")).join("\n"));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const n = (s: string) => Number(s.replace(",", ".")) || 0;
  const prefix = zone?.id ?? "new";

  const setPolygon = (polygon: [number, number][]) => {
    setV((p) => ({ ...p, polygon }));
    setCoordsText(polygon.map((p) => p.join(", ")).join("\n"));
  };

  const save = () =>
    start(async () => {
      const res = await saveZoneAction(zone?.id ?? null, {
        name: v.name,
        color: v.color,
        fee: n(v.fee),
        minOrder: n(v.minOrder),
        freeFrom: v.freeFrom.trim() ? n(v.freeFrom) : null,
        etaMinutes: n(v.etaMinutes),
        isActive: v.isActive,
        sortOrder: n(v.sortOrder),
        polygon: v.polygon,
      });
      setMessage({ ok: res.ok, text: res.ok ? (res.message ?? "Сохранено") : res.error });
      if (res.ok) onDone();
    });

  return (
    <section className="grid gap-2 rounded-card border border-line bg-surface p-2 md:p-3 lg:grid-cols-[1fr_1fr]" aria-label={v.name || "Новая зона"}>
      <ZonePolygonEditor value={v.polygon} onChange={setPolygon} center={center} color={v.color} others={others.filter((o) => o.id !== zone?.id)} />
      <div className="flex flex-col gap-1.5">
        <TextField id={`${prefix}-name`} label="Название зоны" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-1.5">
          <TextField id={`${prefix}-fee`} label="Доставка, ₽" inputMode="decimal" value={v.fee} onChange={(e) => setV({ ...v, fee: e.target.value })} />
          <TextField id={`${prefix}-min`} label="Минимальный заказ, ₽" inputMode="decimal" value={v.minOrder} onChange={(e) => setV({ ...v, minOrder: e.target.value })} />
          <TextField id={`${prefix}-free`} label="Бесплатно от, ₽" optional inputMode="decimal" value={v.freeFrom} onChange={(e) => setV({ ...v, freeFrom: e.target.value })} />
          <TextField id={`${prefix}-eta`} label="Время, мин" inputMode="numeric" value={v.etaMinutes} onChange={(e) => setV({ ...v, etaMinutes: e.target.value })} />
          <TextField id={`${prefix}-order`} label="Приоритет" hint="Меньше — важнее при пересечении" inputMode="numeric" value={v.sortOrder} onChange={(e) => setV({ ...v, sortOrder: e.target.value })} />
          <label className="flex flex-col gap-1 text-sm font-medium">
            Цвет на схеме
            <Select value={v.color} onChange={(e) => setV({ ...v, color: e.target.value })}>
              {COLORS.map(([hex, name]) => (
                <option key={hex} value={hex}>
                  {name}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <TextareaField
          id={`${prefix}-coords`}
          label="Координаты: «широта, долгота» по строке"
          hint="Можно вставить из Яндекс Карт или другого инструмента"
          rows={4}
          value={coordsText}
          onChange={(e) => {
            setCoordsText(e.target.value);
            const ring = e.target.value
              .split("\n")
              .map((l) => l.split(/[,;\s]+/).filter(Boolean).map(Number))
              .filter((p) => p.length === 2 && p.every(Number.isFinite)) as [number, number][];
            setV((p) => ({ ...p, polygon: ring }));
          }}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <Switch checked={v.isActive} onCheckedChange={(c) => setV({ ...v, isActive: c })} label={v.isActive ? "Зона работает" : "Зона выключена"} />
          <div className="ml-auto flex items-center gap-1">
            {message ? (
              <span role="status" className={message.ok ? "text-sm text-success" : "text-sm text-accent"}>
                {message.text}
              </span>
            ) : null}
            {zone ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  window.confirm(`Удалить зону «${zone.name}»?`) &&
                  start(async () => {
                    await deleteZoneAction(zone.id);
                    onDone();
                  })
                }
              >
                Удалить
              </Button>
            ) : null}
            <Button size="sm" loading={pending} onClick={save}>
              Сохранить зону
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function DeliveryAdmin({
  paused,
  orderHours,
  zones,
  center,
}: {
  paused: boolean;
  orderHours: WeekHoursInput;
  zones: Zone[];
  center: { lat: number; lng: number };
}) {
  const router = useRouter();
  const [isPaused, setPaused] = useState(paused);
  const [hours, setHours] = useState(orderHours);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <section className={`flex flex-wrap items-center gap-2 rounded-card border p-2 md:p-3 ${isPaused ? "border-cinnabar bg-surface" : "border-line bg-surface"}`}>
        <Switch
          checked={isPaused}
          label={<span className="text-base font-semibold">Пауза приёма заказов</span>}
          onCheckedChange={(next) => {
            setPaused(next);
            start(async () => {
              const r = await setOrdersPausedAction(next);
              setMessage(r.ok ? (r.message ?? null) : r.error);
            });
          }}
        />
        <p className="text-sm text-fg-muted">
          {isPaused ? (
            <b className="font-semibold text-accent">Сейчас заказы не принимаются.</b>
          ) : (
            <b className="font-semibold text-success">Сейчас заказы принимаются.</b>
          )}{" "}
          На паузе гости видят сообщение и не могут оформить заказ.
        </p>
      </section>

      <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-2 md:p-3">
        <h2 className="text-title font-semibold">Часы приёма заказов</h2>
        <WeekHoursEditor idPrefix="orders" value={hours} onChange={setHours} />
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            loading={pending}
            onClick={() =>
              start(async () => {
                const r = await saveOrderHoursAction(hours);
                setMessage(r.ok ? (r.message ?? null) : r.error);
              })
            }
          >
            Сохранить часы
          </Button>
          <p role="status" aria-live="polite" className="text-sm text-fg-muted">
            {message}
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <h2 className="text-title font-semibold">Зоны доставки</h2>
        <ul className="flex flex-wrap gap-1 text-sm">
          {zones.map((z) => (
            <li key={z.id} className="rounded-full border border-line-strong px-1.5 py-0.5">
              {z.name}: {formatRub(z.fee)}, от {formatRub(z.minOrder)}
              {z.isActive ? "" : " · выключена"}
            </li>
          ))}
        </ul>
        {zones.map((z) => (
          <ZoneCard key={`${z.id}-${z.polygon.length}-${z.fee}`} zone={z} others={zones} center={center} onDone={() => router.refresh()} />
        ))}
        {adding ? (
          <ZoneCard zone={null} others={zones} center={center} onDone={() => { setAdding(false); router.refresh(); }} />
        ) : (
          <Button variant="secondary" className="self-start" icon={<Plus className="size-2" aria-hidden="true" />} onClick={() => setAdding(true)}>
            Новая зона
          </Button>
        )}
      </div>
    </div>
  );
}
