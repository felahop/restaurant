"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Input, TextField } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { deleteModifierGroupAction, saveModifierGroupAction } from "@/app/admin/(panel)/menu/actions";

type Mod = { id: string | null; name: string; price: string; isAvailable: boolean };
type Group = { id: string | null; name: string; minSelect: string; maxSelect: string; modifiers: Mod[]; dishCount: number };

function GroupCard({ group, onDone }: { group: Group; onDone: () => void }) {
  const [g, setG] = useState(group);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const setMod = (i: number, patch: Partial<Mod>) => setG((p) => ({ ...p, modifiers: p.modifiers.map((m, j) => (j === i ? { ...m, ...patch } : m)) }));

  const save = () =>
    start(async () => {
      const res = await saveModifierGroupAction(g.id, {
        name: g.name,
        minSelect: Number(g.minSelect) || 0,
        maxSelect: Number(g.maxSelect) || 1,
        modifiers: g.modifiers.map((m) => ({ id: m.id, name: m.name, price: Number(m.price.replace(",", ".")) || 0, isAvailable: m.isAvailable })),
      });
      setMessage({ ok: res.ok, text: res.ok ? (res.message ?? "Сохранено") : res.error });
      if (res.ok) onDone();
    });

  const prefix = g.id ?? "new";
  return (
    <section className="flex flex-col gap-1.5 rounded-card border border-line bg-surface p-2" aria-label={g.name || "Новая группа"}>
      <div className="grid gap-1.5 sm:grid-cols-[2fr_1fr_1fr]">
        <TextField id={`${prefix}-name`} label="Название группы" value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} />
        <TextField id={`${prefix}-min`} label="Минимум" inputMode="numeric" hint="1 — обязательный выбор" value={g.minSelect} onChange={(e) => setG({ ...g, minSelect: e.target.value })} />
        <TextField id={`${prefix}-max`} label="Максимум" inputMode="numeric" value={g.maxSelect} onChange={(e) => setG({ ...g, maxSelect: e.target.value })} />
      </div>
      <ul className="flex flex-col gap-0.5">
        {g.modifiers.map((m, i) => (
          <li key={m.id ?? `n${i}`} className="flex flex-wrap items-center gap-1 border-b border-line pb-1 sm:flex-nowrap sm:border-0 sm:pb-0">
            <div className="w-full min-w-0 sm:w-auto sm:flex-1">
              <Input dense aria-label="Название добавки" value={m.name} onChange={(e) => setMod(i, { name: e.target.value })} />
            </div>
            <div className="flex w-12 shrink-0 items-center gap-0.5">
              <Input dense aria-label={`Цена, ₽: ${m.name}`} inputMode="decimal" value={m.price} onChange={(e) => setMod(i, { price: e.target.value })} />
              <span className="text-sm text-fg-muted" aria-hidden="true">
                ₽
              </span>
            </div>
            <Switch checked={m.isAvailable} label="Есть" aria-label={`Есть в наличии: ${m.name}`} onCheckedChange={(c) => setMod(i, { isAvailable: c })} />
            <IconButton label={`Убрать: ${m.name}`} onClick={() => setG((p) => ({ ...p, modifiers: p.modifiers.filter((_, j) => j !== i) }))}>
              <Trash2 className="size-2" aria-hidden="true" />
            </IconButton>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-1">
        <Button size="sm" variant="ghost" icon={<Plus className="size-2" aria-hidden="true" />} onClick={() => setG((p) => ({ ...p, modifiers: [...p.modifiers, { id: null, name: "", price: "0", isAvailable: true }] }))}>
          Добавка
        </Button>
        <span className="text-sm text-fg-muted">{g.id ? `Используется в блюдах: ${g.dishCount}` : null}</span>
        <div className="ml-auto flex items-center gap-1">
          {message ? (
            <span role="status" className={message.ok ? "text-sm text-success" : "text-sm text-accent"}>
              {message.text}
            </span>
          ) : null}
          {g.id ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                window.confirm(`Удалить группу «${g.name}»? Она пропадёт у всех блюд.`) &&
                start(async () => {
                  await deleteModifierGroupAction(g.id!);
                  onDone();
                })
              }
            >
              Удалить группу
            </Button>
          ) : null}
          <Button size="sm" loading={pending} onClick={save}>
            Сохранить
          </Button>
        </div>
      </div>
    </section>
  );
}

export function ModifierGroupsEditor({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      {groups.map((g) => (
        <GroupCard key={`${g.id}-${g.modifiers.length}-${g.name}`} group={g} onDone={() => router.refresh()} />
      ))}
      {adding ? (
        <GroupCard
          group={{ id: null, name: "", minSelect: "0", maxSelect: "1", modifiers: [{ id: null, name: "", price: "0", isAvailable: true }], dishCount: 0 }}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      ) : (
        <Button variant="secondary" className="self-start" icon={<Plus className="size-2" aria-hidden="true" />} onClick={() => setAdding(true)}>
          Новая группа добавок
        </Button>
      )}
    </div>
  );
}
