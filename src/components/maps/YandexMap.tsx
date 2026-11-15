"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Каркас Яндекс Карты (JavaScript API v3). Типы и имена классов — из официального пакета @yandex/ymaps3-types:
 * YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapFeature (многоугольник), YMapMarker.
 * Координаты в API v3 — [долгота, широта]; в базе зоны хранятся как [широта, долгота], поэтому меняем местами.
 * Если API не загрузилось (нет сети, неверный ключ), остаётся fallback — фирменная схема.
 */

export type MapZone = { id: string; name: string; color: string; polygon: [number, number][] };

type Props = {
  apiKey: string;
  scriptUrl: string;
  center: { lat: number; lng: number };
  zoom?: number;
  zones?: MapZone[];
  markerLabel?: string;
  /** Подпись карты для чтения с экрана. */
  label: string;
  className?: string;
  fallback: ReactNode;
};

let loader: Promise<void> | null = null;

function loadApi(scriptUrl: string, apiKey: string): Promise<void> {
  if (typeof window !== "undefined" && "ymaps3" in window) return ymaps3.ready;
  loader ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${scriptUrl}?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
    script.async = true;
    script.onload = () => ymaps3.ready.then(resolve, reject);
    script.onerror = () => {
      loader = null;
      reject(new Error("Яндекс Карты не загрузились"));
    };
    document.head.append(script);
  });
  return loader;
}

export function YandexMap({ apiKey, scriptUrl, center, zoom = 12, zones = [], markerLabel, label, className, fallback }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let map: { destroy(): void } | null = null;
    let cancelled = false;
    loadApi(scriptUrl, apiKey)
      .then(() => {
        if (cancelled || !ref.current) return;
        const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapFeature, YMapMarker } = ymaps3;
        const ymap = new YMap(ref.current, { location: { center: [center.lng, center.lat], zoom } });
        ymap.addChild(new YMapDefaultSchemeLayer({}));
        ymap.addChild(new YMapDefaultFeaturesLayer({}));
        for (const z of zones) {
          ymap.addChild(
            new YMapFeature({
              id: z.id,
              geometry: { type: "Polygon", coordinates: [z.polygon.map(([lat, lng]) => [lng, lat] as [number, number])] },
              // Цвет зоны — данные из админки (как на схеме), а не цвет интерфейса.
              style: { fill: z.color, fillOpacity: 0.18, stroke: [{ color: z.color, width: 2 }] },
            }),
          );
        }
        if (markerLabel) {
          const el = document.createElement("div");
          el.className = "-translate-x-1/2 -translate-y-full rounded-full bg-paper px-1.5 py-0.5 text-sm font-semibold whitespace-nowrap text-ink shadow-pop";
          el.textContent = markerLabel;
          ymap.addChild(new YMapMarker({ coordinates: [center.lng, center.lat] }, el));
        }
        map = ymap;
        setState("ready");
      })
      .catch((e) => {
        console.warn("[maps]", e);
        if (!cancelled) setState("failed");
      });
    return () => {
      cancelled = true;
      map?.destroy();
    };
  }, [apiKey, scriptUrl, center.lat, center.lng, zoom, zones, markerLabel]);

  if (state === "failed") return <>{fallback}</>;
  return (
    <div className={cn("relative overflow-hidden rounded-card border border-line bg-coal", className)}>
      <div ref={ref} role="region" aria-label={label} className="absolute inset-0" />
      {state === "loading" ? <div className="absolute inset-0 animate-pulse bg-coal" aria-hidden="true" /> : null}
    </div>
  );
}
