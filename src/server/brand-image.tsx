import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { KANJI_SUMI, SEAL_PATH } from "@/components/brand/Hanko";
import { palette } from "@/design/tokens";

/**
 * Фирменные картинки (Open Graph, иконка для iOS) через next/og.
 * Шрифты — woff из пакетов @fontsource (SIL OFL), лежат в src/assets/og-fonts: next/og не читает woff2.
 */
const fontFile = (name: string) => readFile(join(process.cwd(), "src/assets/og-fonts", name));

export async function brandFonts() {
  const [delaCyr, delaLat, golosCyr4, golosLat4, golosCyr6, golosLat6] = await Promise.all([
    fontFile("dela-gothic-one-cyrillic-400-normal.woff"),
    fontFile("dela-gothic-one-latin-400-normal.woff"),
    fontFile("golos-text-cyrillic-400-normal.woff"),
    fontFile("golos-text-latin-400-normal.woff"),
    fontFile("golos-text-cyrillic-600-normal.woff"),
    fontFile("golos-text-latin-600-normal.woff"),
  ]);
  return [
    { name: "Dela Gothic One", data: delaCyr, weight: 400 as const, style: "normal" as const },
    { name: "Dela Gothic One", data: delaLat, weight: 400 as const, style: "normal" as const },
    { name: "Golos Text", data: golosCyr4, weight: 400 as const, style: "normal" as const },
    { name: "Golos Text", data: golosLat4, weight: 400 as const, style: "normal" as const },
    { name: "Golos Text", data: golosCyr6, weight: 600 as const, style: "normal" as const },
    { name: "Golos Text", data: golosLat6, weight: 600 as const, style: "normal" as const },
  ];
}

/** Печать-ханко из тех же контуров, что и логотип на сайте. */
export function Seal({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path d={SEAL_PATH} fill={palette.cinnabar} />
      <circle cx="50" cy="50" r="40" fill="none" stroke={palette.white} strokeWidth="1.6" opacity="0.85" />
      <path d={KANJI_SUMI} transform="matrix(0.06 0 0 -0.06 19.97 72.8)" fill={palette.white} />
    </svg>
  );
}

/** Крупный иероглиф 炭 фоном — тот же приём, что в секциях сайта (прозрачность 6 %). */
export function KanjiBackdrop({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 -880 1000 1000"
      style={{ position: "absolute", right: -60, bottom: -90, opacity: 0.06 }}
    >
      <path d={KANJI_SUMI} transform="scale(1 -1)" fill={palette.paper} />
    </svg>
  );
}
