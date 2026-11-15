"use client";

import { useRef, useState } from "react";
import { Hanko } from "@/components/brand/Hanko";
import { palette } from "@/design/tokens";

type Ring = [number, number][];
type OtherZone = { id: string; color: string; polygon: Ring };

/**
 * Редактор многоугольника зоны на схеме вокруг ресторана: клик по схеме — новая точка,
 * точки можно перетаскивать (мышью и пальцем), правый клик или кнопка «Убрать точку» — удалить.
 * TODO: с ключом Яндекс Карт (JS API) показать под схемой настоящую карту.
 */
export function ZonePolygonEditor({
  value,
  onChange,
  center,
  color,
  others,
}: {
  value: Ring;
  onChange: (ring: Ring) => void;
  center: { lat: number; lng: number };
  color: string;
  others: OtherZone[];
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const k = Math.cos((center.lat * Math.PI) / 180);
  const SCALE = 1000;
  const project = ([lat, lng]: [number, number]) => [(lng - center.lng) * k * SCALE, -(lat - center.lat) * SCALE] as const;
  const unproject = (x: number, y: number): [number, number] => [
    Number((center.lat - y / SCALE).toFixed(6)),
    Number((center.lng + x / (k * SCALE)).toFixed(6)),
  ];

  const all = [...value, ...others.flatMap((o) => o.polygon)].map(project);
  const extent = Math.max(40, ...all.map(([x, y]) => Math.max(Math.abs(x), Math.abs(y)))) * 1.15;
  const view = `${-extent} ${-extent} ${extent * 2} ${extent * 2}`;

  const toSvg = (e: { clientX: number; clientY: number }) => {
    const el = svg.current!;
    const pt = el.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(el.getScreenCTM()!.inverse());
    return [p.x, p.y] as const;
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="relative aspect-square w-full max-w-120 overflow-hidden rounded-card border border-line bg-coal">
        <svg
          ref={svg}
          viewBox={view}
          className="absolute inset-0 size-full touch-none"
          role="application"
          aria-label="Схема зоны доставки: нажмите, чтобы добавить точку, перетащите точку, чтобы сдвинуть"
          onPointerDown={(e) => {
            if (e.target !== e.currentTarget) return;
            const [x, y] = toSvg(e);
            onChange([...value, unproject(x, y)]);
            setSelected(value.length);
          }}
          onPointerMove={(e) => {
            if (drag === null) return;
            const [x, y] = toSvg(e);
            onChange(value.map((p, i) => (i === drag ? unproject(x, y) : p)));
          }}
          onPointerUp={() => setDrag(null)}
          onPointerLeave={() => setDrag(null)}
        >
          <g className="stroke-ash" strokeWidth={extent / 300}>
            {Array.from({ length: 11 }, (_, i) => {
              const c = -extent + (extent / 5) * i;
              return (
                <g key={i}>
                  <line x1={c} y1={-extent} x2={c} y2={extent} />
                  <line x1={-extent} y1={c} x2={extent} y2={c} />
                </g>
              );
            })}
          </g>
          {others.map((o) => (
            <polygon key={o.id} points={o.polygon.map((p) => project(p).join(",")).join(" ")} fill={o.color} fillOpacity={0.08} stroke={o.color} strokeOpacity={0.5} strokeWidth={extent / 250} pointerEvents="none" />
          ))}
          {value.length >= 2 ? (
            <polygon points={value.map((p) => project(p).join(",")).join(" ")} fill={color} fillOpacity={0.22} stroke={color} strokeWidth={extent / 150} pointerEvents="none" />
          ) : null}
          {value.map((p, i) => {
            const [x, y] = project(p);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={extent / 45}
                fill={i === selected ? palette.white : color}
                stroke={palette.white}
                strokeWidth={extent / 300}
                className="cursor-grab"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  (e.target as Element).setPointerCapture?.(e.pointerId);
                  setDrag(i);
                  setSelected(i);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onChange(value.filter((_, j) => j !== i));
                  setSelected(null);
                }}
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
          <Hanko className="size-3" />
        </div>
      </div>
      <div className="flex flex-wrap gap-1 text-sm">
        <button type="button" className="min-h-5.5 rounded-full border border-line-strong px-1.5 disabled:opacity-50" disabled={selected === null} onClick={() => { onChange(value.filter((_, j) => j !== selected)); setSelected(null); }}>
          Убрать точку
        </button>
        <button type="button" className="min-h-5.5 rounded-full border border-line-strong px-1.5" onClick={() => { onChange([]); setSelected(null); }}>
          Очистить
        </button>
        <span className="self-center text-fg-muted">Точек: {value.length}. Печать в центре — ресторан.</span>
      </div>
    </div>
  );
}
