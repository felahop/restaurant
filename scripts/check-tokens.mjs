#!/usr/bin/env node
/**
 * Проверка «в коде нет цветов и размеров шрифтов мимо токенов».
 * Сырые значения разрешены только в src/app/globals.css (токены) и src/design/tokens.ts (зеркало).
 * Точечное исключение: комментарий `tokens-ignore` на той же строке.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");
const ALLOWED_FILES = new Set([
  "src/app/globals.css",
  "src/design/tokens.ts",
  "src/design/contrast.ts",
  // Картинки next/og (Open Graph, иконка): движок понимает только inline-стили; цвета берутся из palette (tokens.ts).
  "src/app/opengraph-image.tsx",
  "src/app/apple-icon.tsx",
  "src/server/brand-image.tsx",
]);
const EXTENSIONS = /\.(tsx?|css|mjs)$/;

const utility =
  "(?:text|bg|border(?:-[trblxy])?|fill|stroke|from|via|to|ring|outline|decoration|shadow|accent|caret|placeholder|divide)";

const rules = [
  { name: "hex-цвет", re: /(?<![\w&/])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![\w-])/ },
  { name: "цвет-функцией", re: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/ },
  {
    name: "произвольный цвет/размер в классе",
    re: new RegExp(`(?<![\\w-])${utility}-\\[(?:#|\\d|rgb|hsl|oklch|color:|length:|calc)`),
  },
  {
    name: "стандартная палитра Tailwind",
    re: new RegExp(
      `(?<![\\w-])${utility}-(?:slate|gray|zinc|neutral|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black)(?:-\\d{2,3})?(?![\\w-])`,
    ),
  },
  { name: "размер шрифта не из шкалы", re: /(?<![\w-])text-(?:lg|xl|[2-9]xl)(?![\w-])/ },
  { name: "inline-стиль цвета/шрифта", re: /style=\{\{[^}]*\b(?:color|fontSize|background(?:Color)?|fontFamily)\s*:/ },
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (EXTENSIONS.test(name)) out.push(p);
  }
  return out;
}

const problems = [];
for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  if (ALLOWED_FILES.has(rel) || rel.startsWith("src/generated/")) continue;
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (line.includes("tokens-ignore")) return;
    for (const rule of rules) {
      const m = rule.re.exec(line);
      if (m) problems.push(`${rel}:${i + 1}  ${rule.name}: «${m[0]}»`);
    }
  });
}

if (problems.length) {
  console.error(`Найдены значения мимо токенов (${problems.length}):\n` + problems.join("\n"));
  process.exit(1);
}
console.log("Токены: нарушений нет.");
