/**
 * CSV для Excel и Google Таблиц в русской локали: разделитель «;», BOM для UTF-8, дробная часть через запятую.
 * Ячейки, начинающиеся с = + - @ (формулы), экранируются апострофом — защита от CSV-инъекций.
 */
export type Cell = string | number | null | undefined;

const FORMULA = /^[=+\-@\t\r]/;

export function csvCell(value: Cell): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "number" ? String(value) : value;
  if (typeof value === "string" && FORMULA.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(";"));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** Копейки → «1380,50» (число для таблицы, без пробелов и знака рубля). */
export function rubCell(kopecks: number): string {
  const sign = kopecks < 0 ? "-" : "";
  const abs = Math.abs(kopecks);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}
