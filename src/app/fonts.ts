import { Dela_Gothic_One, Golos_Text } from "next/font/google";
import localFont from "next/font/local";

/** Заголовки. Только крупные заголовки, никогда не для абзацев. */
export const delaGothic = Dela_Gothic_One({
  weight: "400",
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-dela",
});

/** Текст и интерфейс. */
export const golos = Golos_Text({
  weight: ["400", "500", "600"],
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-golos",
});

/**
 * Декоративные иероглифы (Noto Serif JP 600, SIL OFL 1.1).
 * Подмножество только нужных знаков, 8 КБ: 炭火麺鍋味旬宴道縁食店包点心巻辛甘酒茶家餃飯湯煙.
 * Чтобы добавить знак, пересоберите подмножество (см. CREDITS.md).
 */
export const notoSerifJp = localFont({
  src: "../fonts/noto-serif-jp-kanji-600.woff2",
  weight: "600",
  display: "swap",
  preload: false,
  variable: "--font-noto-jp",
});
