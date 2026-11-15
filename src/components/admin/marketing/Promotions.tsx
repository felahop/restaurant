"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/Choice";
import { TextareaField, TextField } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { deletePromotionAction, savePromotionAction } from "@/app/admin/(panel)/marketing/actions";
import { ImageCropUpload } from "@/components/admin/menu/ImageCropUpload";

export type PromotionRow = {
  id: string;
  kind: "PROMO" | "BANNER";
  badge: string | null;
  title: string;
  text: string;
  period: string | null;
  kanji: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  sortOrder: number;
};

const toInputDate = (iso: string | null) => (iso ? iso.slice(0, 16) : "");
const orNull = (s: string) => (s.trim() ? s.trim() : null);

function PromotionForm({ row, onDone }: { row: PromotionRow | null; onDone: () => void }) {
  const [v, setV] = useState({
    kind: row?.kind ?? ("PROMO" as "PROMO" | "BANNER"),
    badge: row?.badge ?? "",
    title: row?.title ?? "",
    text: row?.text ?? "",
    period: row?.period ?? "",
    kanji: row?.kanji ?? "",
    imageUrl: row?.imageUrl ?? null,
    ctaLabel: row?.ctaLabel ?? "",
    ctaHref: row?.ctaHref ?? "",
    startsAt: toInputDate(row?.startsAt ?? null),
    endsAt: toInputDate(row?.endsAt ?? null),
    isActive: row?.isActive ?? true,
    sortOrder: String(row?.sortOrder ?? 100),
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const p = row?.id ?? "new-promotion";
  return (
    <form
      className="flex flex-col gap-1.5 rounded-card border border-line bg-surface p-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await savePromotionAction(row?.id ?? null, {
            kind: v.kind,
            badge: orNull(v.badge),
            title: v.title,
            text: v.text,
            period: orNull(v.period),
            kanji: orNull(v.kanji),
            imageUrl: v.imageUrl,
            ctaLabel: orNull(v.ctaLabel),
            ctaHref: orNull(v.ctaHref),
            startsAt: v.startsAt ? new Date(v.startsAt).toISOString() : null,
            endsAt: v.endsAt ? new Date(v.endsAt).toISOString() : null,
            isActive: v.isActive,
            sortOrder: Number(v.sortOrder) || 0,
          });
          if (res.ok) onDone();
          else setError(res.error);
        });
      }}
    >
      <SegmentedControl
        name={`${p}-kind`}
        legend="Где показывать"
        value={v.kind}
        onChange={(k) => setV({ ...v, kind: k })}
        options={[
          { value: "PROMO", label: "Акция (блок «Акции» на главной)" },
          { value: "BANNER", label: "Баннер (полоса над хитами и меню)" },
        ]}
      />
      <div className="grid gap-1.5 md:grid-cols-3">
        <TextField id={`${p}-title`} label="Заголовок" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
        <TextField id={`${p}-badge`} label="Метка" optional placeholder="−20%" value={v.badge} onChange={(e) => setV({ ...v, badge: e.target.value })} />
        <TextField id={`${p}-period`} label="Когда действует (текст)" optional placeholder="Пн–Пт, 12:00–16:00" value={v.period} onChange={(e) => setV({ ...v, period: e.target.value })} />
      </div>
      <TextareaField id={`${p}-text`} label="Текст" rows={2} value={v.text} onChange={(e) => setV({ ...v, text: e.target.value })} />
      <div className="grid gap-1.5 md:grid-cols-4">
        <TextField id={`${p}-cta`} label="Кнопка" optional placeholder="Выбрать вок" value={v.ctaLabel} onChange={(e) => setV({ ...v, ctaLabel: e.target.value })} />
        <TextField id={`${p}-href`} label="Ссылка кнопки" optional placeholder="/menu" value={v.ctaHref} onChange={(e) => setV({ ...v, ctaHref: e.target.value })} />
        <TextField id={`${p}-from`} type="datetime-local" label="Показывать с" optional value={v.startsAt} onChange={(e) => setV({ ...v, startsAt: e.target.value })} />
        <TextField id={`${p}-to`} type="datetime-local" label="Показывать до" optional value={v.endsAt} onChange={(e) => setV({ ...v, endsAt: e.target.value })} />
        <TextField id={`${p}-kanji`} label="Иероглиф фона" optional maxLength={2} value={v.kanji} onChange={(e) => setV({ ...v, kanji: e.target.value })} />
        <TextField id={`${p}-sort`} label="Порядок" inputMode="numeric" value={v.sortOrder} onChange={(e) => setV({ ...v, sortOrder: e.target.value })} />
      </div>
      <ImageCropUpload folder="promotions" label="Картинка (необязательно)" value={v.imageUrl} onChange={(url) => setV({ ...v, imageUrl: url })} />
      <div className="flex flex-wrap items-center gap-1">
        <Switch checked={v.isActive} onCheckedChange={(c) => setV({ ...v, isActive: c })} label={v.isActive ? "Показывается" : "Скрыта"} />
        {error ? (
          <p role="alert" className="text-sm text-accent">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="sm" loading={pending} className="ml-auto">
          Сохранить
        </Button>
      </div>
    </form>
  );
}

export function Promotions({ rows }: { rows: PromotionRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [, start] = useTransition();
  const done = () => {
    setEditing(null);
    router.refresh();
  };
  return (
    <section className="flex flex-col gap-1.5" aria-labelledby="promotions-title">
      <div className="flex items-center justify-between">
        <h2 id="promotions-title" className="text-title font-semibold">
          Акции и баннеры
        </h2>
        <Button size="sm" variant="secondary" icon={<Plus className="size-2" aria-hidden="true" />} onClick={() => setEditing("new")}>
          Новая акция
        </Button>
      </div>
      {editing === "new" ? <PromotionForm row={null} onDone={done} /> : null}
      <ul className="flex flex-col gap-1">
        {rows.map((r) =>
          editing === r.id ? (
            <li key={r.id}>
              <PromotionForm row={r} onDone={done} />
            </li>
          ) : (
            <li key={r.id} className="flex flex-wrap items-center gap-1 rounded-card border border-line bg-surface p-1.5">
              <Badge tone={r.kind === "BANNER" ? "promo" : "neutral"}>{r.kind === "BANNER" ? "Баннер" : "Акция"}</Badge>
              <span className="font-semibold">{r.title}</span>
              {r.isActive ? null : <Badge tone="soldOut">скрыта</Badge>}
              <span className="text-sm text-fg-muted">{r.period}</span>
              <span className="ml-auto flex">
                <Button size="sm" variant="ghost" onClick={() => setEditing(r.id)}>
                  Изменить
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    window.confirm(`Удалить «${r.title}»?`) &&
                    start(async () => {
                      await deletePromotionAction(r.id);
                      router.refresh();
                    })
                  }
                >
                  Удалить
                </Button>
              </span>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
