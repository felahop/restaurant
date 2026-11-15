"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { deleteCategoryAction, reorderCategoriesAction, saveCategoryAction } from "@/app/admin/(panel)/menu/actions";
import { SortableList } from "./SortableList";

type Cat = { id: string; name: string; isHidden: boolean; dishCount: number; kanji: string | null };

export function CategoriesEditor({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [items, setItems] = useState(categories);
  const [source, setSource] = useState(categories);
  if (source !== categories) {
    setSource(categories);
    setItems(categories);
  }
  const [newName, setNewName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, refresh = true) =>
    start(async () => {
      const r = await fn();
      setMessage(r.ok ? (r.message ?? "Готово") : (r.error ?? "Ошибка"));
      if (refresh) router.refresh();
    });

  return (
    <div className="flex flex-col gap-2">
      <p role="status" aria-live="polite" className="min-h-2.5 text-sm text-fg-muted">
        {message ?? "Порядок здесь — порядок разделов в меню на сайте. Скрытая категория не видна гостям."}
      </p>
      <div className="rounded-card border border-line bg-surface">
        <SortableList
          label="Категории"
          items={items}
          onReorder={(next) => {
            setItems(next);
            run(() => reorderCategoriesAction(next.map((c) => c.id)), false);
          }}
          renderItem={(c, handle) => (
            <div className="flex flex-wrap items-center gap-1 px-1 py-1 sm:flex-nowrap">
              {/* На телефоне название занимает всю строку, переключатели — под ним. */}
              <div className="flex w-full min-w-0 items-center gap-1 sm:w-auto sm:flex-1">
                {handle}
                <Input
                  dense
                  aria-label={`Название категории ${c.name}`}
                  defaultValue={c.name}
                  onBlur={(e) => {
                    const name = e.target.value.trim();
                    if (name && name !== c.name) run(() => saveCategoryAction(c.id, { name, kanji: c.kanji, isHidden: c.isHidden }));
                  }}
                />
              </div>
              <span className="w-8 pl-1 text-sm text-fg-muted tabular-nums sm:pl-0">{c.dishCount} бл.</span>
              <Switch
                checked={!c.isHidden}
                label={c.isHidden ? "Скрыта" : "Видна"}
                aria-label={`Показывать категорию ${c.name}`}
                onCheckedChange={(visible) => run(() => saveCategoryAction(c.id, { name: c.name, kanji: c.kanji, isHidden: !visible }))}
              />
              <IconButton
                label={`Удалить категорию ${c.name}`}
                disabled={c.dishCount > 0}
                onClick={() => window.confirm(`Удалить категорию «${c.name}»?`) && run(() => deleteCategoryAction(c.id))}
              >
                <Trash2 className="size-2" aria-hidden="true" />
              </IconButton>
            </div>
          )}
        />
      </div>
      <form
        className="flex gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          run(() => saveCategoryAction(null, { name: newName, kanji: null, isHidden: false }));
          setNewName("");
        }}
      >
        <Input aria-label="Название новой категории" placeholder="Новая категория, например «Сезонное»" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <Button type="submit" loading={pending} icon={<Plus className="size-2" aria-hidden="true" />}>
          Добавить
        </Button>
      </form>
    </div>
  );
}
