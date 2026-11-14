import { cn } from "@/lib/cn";

/** Мазок кисти под заголовком. Цвет задаётся через text-* (по умолчанию ginger). */
export function BrushStroke({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 18"
      preserveAspectRatio="none"
      className={cn("block h-1.5 w-15 text-ginger", className)}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M3 10.6C24 7.4 58 5.2 96 4.6c42-.7 86 .3 137 2.4 2.6.1 4.4 1.6 4 3.3-.4 1.6-2.4 2.4-5 2.3-34-1.6-70-1.9-104-1.2-40 .8-79 3.3-118 6.6C6 18.3 2.6 17 2 15c-.6-2 .3-3.9 1-4.4Z"
      />
      <path
        fill="currentColor"
        opacity="0.55"
        d="M30 7.2c30-2.1 70-3.3 112-2.6 1 .1 1 .9 0 1-41 .1-80 1.3-112 3.2-.9 0-1-1.5 0-1.6ZM150 13.4c22 .1 44 .6 70 1.6.8 0 .8 1 0 1-25-.6-48-.8-70-.8-.8 0-.8-1.8 0-1.8Z"
      />
    </svg>
  );
}
