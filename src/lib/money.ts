const NBSP = " ";

const rubFormatter = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const rubFormatterFraction = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Форматирует сумму в копейках: 187000 → «1 870 ₽». Копейки показываем, только если они есть. */
export function formatRub(kopecks: number): string {
  if (!Number.isInteger(kopecks)) throw new Error("Сумма должна быть целым числом копеек");
  const hasFraction = kopecks % 100 !== 0;
  const value = kopecks / 100;
  const formatted = (hasFraction ? rubFormatterFraction : rubFormatter).format(value);
  // Intl для ru-RU разделяет разряды узким неразрывным пробелом; приводим к обычному неразрывному.
  return `${formatted.replace(/ /g, NBSP)}${NBSP}₽`;
}

/** Склонение: plural(3, ["блюдо", "блюда", "блюд"]) → «блюда». */
export function plural(n: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}
