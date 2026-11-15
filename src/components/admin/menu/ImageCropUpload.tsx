"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Обрезка выбранной области в canvas → JPEG (сервер затем сожмёт в WebP 1600×1200). */
async function cropToBlob(src: string, area: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = src;
  });
  const scale = Math.min(1, 2000 / area.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(area.width * scale);
  canvas.height = Math.round(area.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas недоступен");
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Пустой кадр"))), "image/jpeg", 0.92));
}

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
  folder?: "dishes" | "promotions";
  label?: string;
};

/** Фото с обрезкой 4:3: выбрать файл → подвинуть кадр → загрузить. */
export function ImageCropUpload({ value, onChange, folder = "dishes", label = "Фото" }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const pick = (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Нужна картинка");
    if (file.size > 10 * 1024 * 1024) return setError("Файл больше 10 МБ");
    setSrc(URL.createObjectURL(file));
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    dialog.current?.showModal();
  };

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const upload = async () => {
    if (!src || !area) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await cropToBlob(src, area);
      const form = new FormData();
      form.append("file", new File([blob], "photo.jpg", { type: "image/jpeg" }));
      form.append("folder", folder);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) throw new Error(body.error ?? "Не получилось загрузить");
      onChange(body.url);
      dialog.current?.close();
      URL.revokeObjectURL(src);
      setSrc(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-fg">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative aspect-4/3 w-30 overflow-hidden rounded-card bg-surface-2">
          {value ? (
            <Image src={value} alt="Текущее фото" fill sizes="240px" className="object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-sm text-fg-muted">Нет фото</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" id={`${folder}-photo`} onChange={(e) => pick(e.target.files?.[0])} />
          <Button size="sm" variant="secondary" icon={<ImagePlus className="size-2" aria-hidden="true" />} onClick={() => input.current?.click()}>
            {value ? "Заменить фото" : "Загрузить фото"}
          </Button>
          {value ? (
            <Button size="sm" variant="ghost" icon={<Trash2 className="size-2" aria-hidden="true" />} onClick={() => onChange(null)}>
              Убрать
            </Button>
          ) : null}
          <span className="text-xs text-fg-muted">JPEG, PNG или WebP до 10 МБ. Кадр 4:3.</span>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      ) : null}

      <dialog ref={dialog} aria-label="Обрезка фото" className="theme-light m-auto w-full max-w-160 rounded-card bg-surface p-2 text-fg backdrop:bg-shade">
        <div className="flex flex-col gap-2">
          <h2 className="text-title font-semibold">Выберите кадр 4:3</h2>
          <div className="relative aspect-4/3 w-full overflow-hidden rounded-field bg-ink">
            {src ? (
              <Cropper image={src} crop={crop} zoom={zoom} aspect={4 / 3} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
            ) : null}
          </div>
          <label className="flex items-center gap-1 text-sm">
            Масштаб
            <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-cinnabar" />
          </label>
          <div className="flex justify-end gap-1">
            <Button variant="ghost" onClick={() => dialog.current?.close()}>
              Отмена
            </Button>
            <Button loading={busy} onClick={upload}>
              Обрезать и загрузить
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
