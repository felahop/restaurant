import { Suspense } from "react";
import { connection } from "next/server";
import { Hanko } from "@/components/brand/Hanko";

/** Фирменная схема вместо карты: пруд, бульвар, переулки и печать на месте ресторана. */
function MapSchematic() {
  return (
    <svg
      viewBox="0 0 640 480"
      className="absolute inset-0 size-full"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="640" height="480" className="fill-coal" />
      <g className="stroke-ash" strokeWidth="14" fill="none" strokeLinecap="round">
        <path d="M-20 120 L660 40" />
        <path d="M-20 420 L660 330" />
        <path d="M120 -20 L180 500" />
        <path d="M470 -20 L520 500" />
      </g>
      <g className="stroke-ash" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.8">
        <path d="M-20 260 L660 190" />
        <path d="M300 -20 L340 500" />
        <path d="M180 330 L470 300" />
        <path d="M30 40 L120 120" />
      </g>
      {/* Бульвар с прудом */}
      <path
        d="M210 150 C 260 120, 420 110, 450 150 C 470 185, 440 215, 380 222 C 300 232, 220 220, 205 190 C 198 175, 200 160, 210 150 Z"
        className="fill-ash"
        opacity="0.9"
      />
      <path
        d="M220 168 C 270 146, 410 140, 432 160"
        className="stroke-sesame"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />
    </svg>
  );
}

async function StaticMapImage() {
  await connection(); // ключ читается во время запроса, а не при сборке
  if (!process.env.YANDEX_MAPS_STATIC_API_KEY) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- картинка уже оптимизирована Яндексом и кэшируется прокси
    <img
      src="/api/static-map"
      alt=""
      width={650}
      height={450}
      loading="lazy"
      decoding="async"
      className="absolute inset-0 size-full object-cover"
    />
  );
}

/** Карта для блока «Как нас найти»: статичная карта Яндекса при наличии ключа, иначе фирменная схема. */
export function MapPreview({ name, address }: { name: string; address: string }) {
  return (
    <div
      role="img"
      aria-label={`Карта: ${address}`}
      className="relative aspect-4/3 overflow-hidden rounded-card border border-line bg-coal"
    >
      <MapSchematic />
      <Suspense fallback={null}>
        <StaticMapImage />
      </Suspense>
      <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-full flex-col items-center">
        <span className="mb-1 inline-flex h-3 items-center rounded-full bg-paper px-1.5 text-sm font-semibold whitespace-nowrap text-ink shadow-pop">
          {name}
        </span>
        <Hanko className="size-5" />
      </div>
    </div>
  );
}
