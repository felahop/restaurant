import { cn } from "@/lib/cn";

/**
 * Иллюстрация первого экрана, пока нет фото: миска рамена тонкими линиями под 45°, пар и палочки.
 * Линии — paper, акцент (желток) — ginger. Чистая SVG-графика, ничего не загружает.
 */
export function HeroArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 600"
      className={cn("text-paper", className)}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Пар */}
      <g strokeWidth="2" opacity="0.35">
        <path d="M232 238c-18-26 14-40-2-66s12-42-4-70" />
        <path d="M300 226c-20-30 16-46-2-76s14-48-4-80" />
        <path d="M368 238c-18-26 14-40-2-66s12-42-4-70" />
      </g>
      {/* Нори за краем миски */}
      <path d="M168 312l-6-104 70 -8 8 98" strokeWidth="2" opacity="0.7" />
      <path d="M180 300l-4-78M200 298l-4-82M220 296l-4-84" strokeWidth="1" opacity="0.3" />
      {/* Край и бульон */}
      <ellipse cx="300" cy="330" rx="212" ry="64" strokeWidth="2.5" />
      <ellipse cx="300" cy="336" rx="188" ry="48" strokeWidth="1.25" opacity="0.55" />
      {/* Лапша */}
      <g strokeWidth="1.25" opacity="0.45">
        <path d="M150 346c30-12 50 12 80 0s50 12 80 0 50 12 80 0 40 10 60 2" />
        <path d="M166 360c30-10 50 12 80 0s50 12 80 0 50 12 80 0 30 8 44 2" />
      </g>
      {/* Чашу */}
      <ellipse cx="232" cy="326" rx="48" ry="17" strokeWidth="2" />
      <path d="M232 326c12-2 18-8 8-11s-24 0-26 6 8 9 22 7" strokeWidth="1.25" opacity="0.6" />
      {/* Яйцо */}
      <ellipse cx="378" cy="322" rx="42" ry="19" strokeWidth="2" />
      <ellipse cx="380" cy="320" rx="17" ry="8" className="fill-ginger stroke-ginger" />
      {/* Зелёный лук */}
      <g strokeWidth="1.5" opacity="0.6">
        <circle cx="300" cy="344" r="5" />
        <circle cx="314" cy="338" r="4" />
        <circle cx="290" cy="334" r="4" />
        <circle cx="322" cy="350" r="3" />
      </g>
      {/* Тело миски и ножка */}
      <path d="M88 330c8 112 98 192 212 192s204-80 212-192" strokeWidth="2.5" />
      <path d="M244 516l-6 22h124l-6-22" strokeWidth="2" />
      {/* Узор на миске */}
      <path d="M140 420c40 18 100 30 160 30s120-12 160-30" strokeWidth="1" opacity="0.35" />
      {/* Палочки на краю */}
      <path d="M118 284L560 196" strokeWidth="3" />
      <path d="M128 298L566 214" strokeWidth="3" />
      {/* Угольки */}
      <g className="fill-ginger stroke-none">
        <circle cx="96" cy="560" r="3" opacity="0.7" />
        <circle cx="520" cy="548" r="2" opacity="0.5" />
        <circle cx="470" cy="572" r="2.5" opacity="0.6" />
      </g>
    </svg>
  );
}
