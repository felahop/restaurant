/**
 * Зеркало цветовых токенов из src/app/globals.css для мест, где CSS-переменные недоступны
 * (meta theme-color, Open Graph-картинки, SVG-заглушки). Совпадение с CSS проверяет тест
 * tests/unit/design-tokens.test.ts — правьте оба файла вместе.
 */
export const palette = {
  ink: "#14110f",
  coal: "#1f1b18",
  ash: "#332d28",
  paper: "#f4ede1",
  sesame: "#a39b90",
  cinnabar: "#d9381e",
  ginger: "#e0a43a",
  matcha: "#7a9a5b",
  white: "#ffffff",
  "cinnabar-glow": "#e8553a",
  "cinnabar-deep": "#ba2e18",
  "ginger-deep": "#8a5a12",
  "matcha-deep": "#52703a",
  stone: "#6b6259",
  smoke: "#756c63",
  sand: "#8c8172",
  linen: "#ebe2d3",
} as const;

export type PaletteToken = keyof typeof palette;

/** Семантические токены тёмной и светлой поверхности (как в globals.css). */
export const surfaces = {
  dark: {
    canvas: "ink",
    surface: "coal",
    "surface-2": "ash",
    fg: "paper",
    "fg-muted": "sesame",
    eyebrow: "ginger",
    accent: "cinnabar-glow",
    success: "matcha",
    "line-strong": "smoke",
    focus: "ginger",
  },
  light: {
    canvas: "paper",
    surface: "white",
    "surface-2": "linen",
    fg: "ink",
    "fg-muted": "stone",
    eyebrow: "ginger-deep",
    accent: "cinnabar-deep",
    success: "matcha-deep",
    "line-strong": "sand",
    focus: "ginger-deep",
  },
} as const satisfies Record<string, Record<string, PaletteToken>>;
