"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox, SegmentedControl } from "@/components/ui/Choice";
import { SelectField, TextareaField, TextField } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { allergenLabels } from "@/lib/menu/allergens";
import { slugify } from "@/lib/slug";
import { saveDishAction, type DishInput } from "@/app/admin/(panel)/menu/actions";
import { ImageCropUpload } from "./ImageCropUpload";

type Allergen = keyof typeof allergenLabels;

export type DishFormValues = {
  name: string;
  slug: string;
  categoryId: string;
  description: string;
  composition: string;
  portion: string;
  weightGrams: string;
  volumeMl: string;
  kcal: string;
  proteins: string;
  fats: string;
  carbs: string;
  allergens: Allergen[];
  spiciness: "0" | "1" | "2" | "3";
  price: string;
  oldPrice: string;
  imageUrl: string | null;
  kanji: string;
  isHit: boolean;
  isNew: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isAvailable: boolean;
  groupIds: string[];
};

type Props = {
  id: string | null;
  initial: DishFormValues;
  categories: { id: string; name: string }[];
  groups: { id: string; name: string; summary: string }[];
};

const num = (v: string) => {
  const t = v.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

export function DishForm({ id, initial, categories, groups }: Props) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const set = <K extends keyof DishFormValues>(key: K, value: DishFormValues[K]) => setV((prev) => ({ ...prev, [key]: value }));
  const toggleIn = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  const submit = () =>
    start(async () => {
      const payload: DishInput = {
        name: v.name,
        slug: v.slug || undefined,
        categoryId: v.categoryId,
        description: v.description,
        composition: v.composition,
        portion: v.portion,
        weightGrams: num(v.weightGrams),
        volumeMl: num(v.volumeMl),
        kcal: num(v.kcal),
        proteins: num(v.proteins),
        fats: num(v.fats),
        carbs: num(v.carbs),
        allergens: v.allergens,
        spiciness: Number(v.spiciness),
        price: num(v.price) ?? 0,
        oldPrice: num(v.oldPrice),
        imageUrl: v.imageUrl,
        kanji: v.kanji.trim() || null,
        isHit: v.isHit,
        isNew: v.isNew,
        isVegan: v.isVegan,
        isGlutenFree: v.isGlutenFree,
        isAvailable: v.isAvailable,
        groupIds: v.groupIds,
      };
      const res = await saveDishAction(id, payload);
      if (!res.ok) {
        setErrors(res.fields ?? {});
        setMessage({ ok: false, text: res.error });
        return;
      }
      setErrors({});
      setMessage({ ok: true, text: res.message ?? "Сохранено" });
      if (!id && res.data?.id) router.replace(`/admin/menu/dishes/${res.data.id}`);
      else router.refresh();
    });

  const nutrient = (key: "kcal" | "proteins" | "fats" | "carbs", label: string) => (
    <TextField id={key} label={label} inputMode="decimal" value={v[key]} error={errors[key]} onChange={(e) => set(key, e.target.value)} />
  );

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-3"
    >
      <section className="grid gap-2 rounded-card border border-line bg-surface p-2 md:grid-cols-2 md:p-3">
        <TextField
          id="name"
          label="Название"
          value={v.name}
          error={errors.name}
          maxLength={80}
          onChange={(e) => {
            set("name", e.target.value);
            if (!slugTouched) set("slug", slugify(e.target.value));
          }}
        />
        <TextField
          id="slug"
          label="Адрес страницы"
          hint={`/menu/${v.slug || "…"}`}
          value={v.slug}
          error={errors.slug}
          onChange={(e) => {
            setSlugTouched(true);
            set("slug", e.target.value.toLowerCase());
          }}
        />
        <SelectField id="categoryId" label="Категория" value={v.categoryId} error={errors.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
          <option value="">Выберите…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <TextField id="portion" label="Выход для гостя" placeholder="350 г или 2 шт · 220 г" value={v.portion} error={errors.portion} onChange={(e) => set("portion", e.target.value)} />
        <TextareaField id="description" label="Короткое описание" rows={2} maxLength={200} hint="Видно в карточке меню" value={v.description} error={errors.description} onChange={(e) => set("description", e.target.value)} className="md:col-span-2" />
        <TextareaField id="composition" label="Состав" rows={3} maxLength={1000} value={v.composition} error={errors.composition} onChange={(e) => set("composition", e.target.value)} className="md:col-span-2" />
      </section>

      <section className="grid gap-2 rounded-card border border-line bg-surface p-2 md:grid-cols-4 md:p-3">
        <TextField id="price" label="Цена, ₽" inputMode="decimal" value={v.price} error={errors.price} onChange={(e) => set("price", e.target.value)} />
        <TextField id="oldPrice" label="Старая цена, ₽" optional inputMode="decimal" hint="Для зачёркнутой цены" value={v.oldPrice} error={errors.oldPrice} onChange={(e) => set("oldPrice", e.target.value)} />
        <TextField id="weightGrams" label="Вес, г" optional inputMode="numeric" value={v.weightGrams} error={errors.weightGrams} onChange={(e) => set("weightGrams", e.target.value)} />
        <TextField id="volumeMl" label="Объём, мл" optional inputMode="numeric" value={v.volumeMl} error={errors.volumeMl} onChange={(e) => set("volumeMl", e.target.value)} />
        {nutrient("kcal", "Ккал")}
        {nutrient("proteins", "Белки, г")}
        {nutrient("fats", "Жиры, г")}
        {nutrient("carbs", "Углеводы, г")}
      </section>

      <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-2 md:p-3">
        <ImageCropUpload value={v.imageUrl} onChange={(url) => set("imageUrl", url)} />
        <div className="grid gap-2 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Острота</span>
            <SegmentedControl
              name="spiciness"
              legend="Острота"
              value={v.spiciness}
              onChange={(s) => set("spiciness", s)}
              options={[
                { value: "0", label: "0" },
                { value: "1", label: "1" },
                { value: "2", label: "2" },
                { value: "3", label: "3" },
              ]}
            />
          </div>
          <TextField id="kanji" label="Иероглиф для заглушки" optional maxLength={2} hint="Если нет фото" value={v.kanji} onChange={(e) => set("kanji", e.target.value)} />
        </div>
        <fieldset className="flex flex-wrap gap-x-3">
          <legend className="mb-0.5 text-sm font-medium">Метки</legend>
          <Checkbox label="Хит" checked={v.isHit} onChange={(e) => set("isHit", e.target.checked)} />
          <Checkbox label="Новинка" checked={v.isNew} onChange={(e) => set("isNew", e.target.checked)} />
          <Checkbox label="Веган" checked={v.isVegan} onChange={(e) => set("isVegan", e.target.checked)} />
          <Checkbox label="Без глютена" checked={v.isGlutenFree} onChange={(e) => set("isGlutenFree", e.target.checked)} />
        </fieldset>
        <fieldset className="grid grid-cols-2 gap-x-2 sm:grid-cols-3 md:grid-cols-4">
          <legend className="mb-0.5 text-sm font-medium">Аллергены</legend>
          {(Object.keys(allergenLabels) as Allergen[]).map((a) => (
            <Checkbox key={a} label={allergenLabels[a]} checked={v.allergens.includes(a)} onChange={() => set("allergens", toggleIn(v.allergens, a))} />
          ))}
        </fieldset>
        <fieldset className="flex flex-col">
          <legend className="mb-0.5 text-sm font-medium">
            Группы добавок{" "}
            <Link href="/admin/menu/modifiers" className="font-regular text-fg-muted underline-offset-4 hover:underline">
              (настроить)
            </Link>
          </legend>
          {groups.map((g) => (
            <Checkbox key={g.id} label={g.name} description={g.summary} checked={v.groupIds.includes(g.id)} onChange={() => set("groupIds", toggleIn(v.groupIds, g.id))} />
          ))}
        </fieldset>
      </section>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 rounded-card border border-line bg-surface p-2 shadow-soft">
        <Switch checked={v.isAvailable} onCheckedChange={(c) => set("isAvailable", c)} label={v.isAvailable ? "В продаже" : "В стоп-листе"} />
        <div className="ml-auto flex items-center gap-1.5">
          {message ? (
            <p role="status" className={message.ok ? "text-sm text-success" : "flex items-center gap-0.5 text-sm text-accent"}>
              {message.ok ? null : <CircleAlert className="size-2" aria-hidden="true" />}
              {message.text}
            </p>
          ) : null}
          <Button type="submit" loading={pending}>
            {id ? "Сохранить" : "Создать блюдо"}
          </Button>
        </div>
      </div>
    </form>
  );
}
