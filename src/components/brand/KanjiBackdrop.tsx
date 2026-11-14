import { cn } from "@/lib/cn";

/**
 * Крупный декоративный иероглиф на фоне секции (прозрачность 6 %).
 * Доступные знаки ограничены подмножеством шрифта: 炭火麺鍋味旬宴道縁食店包点心巻辛甘酒茶家餃飯湯煙.
 */
export function KanjiBackdrop({ char, className }: { char: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute select-none font-kanji text-kanji text-fg opacity-6", className)}
    >
      {char}
    </span>
  );
}
