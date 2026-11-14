/** Номера РФ/КЗ (+7). Храним в E.164: +79991234567. */

/**
 * Оставляет до 10 цифр абонентского номера (без кода страны).
 * Префикс «+7» и ведущие 7/8 при полном 11-значном номере отбрасываются.
 */
export function phoneDigits(input: string): string {
  let raw = input.trim();
  const hasCountryCode = raw.startsWith("+7");
  if (hasCountryCode) raw = raw.slice(2);
  let digits = raw.replace(/\D/g, "");
  if (!hasCountryCode && digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

/**
 * Маска для поля ввода: «+7 (999) 123-45-67», допускает неполный ввод.
 * Разделители появляются только перед следующей цифрой, поэтому Backspace работает естественно.
 */
export function formatPhoneInput(input: string): string {
  const trimmed = input.trim();
  // Первая набранная «8» или «7» — это код страны/выхода на межгород.
  if (!trimmed.startsWith("+") && /^[78]$/.test(trimmed.replace(/\D/g, ""))) return "+7 (";
  const d = phoneDigits(input);
  if (d.length === 0) return "";
  let out = "+7 (" + d.slice(0, 3);
  if (d.length > 3) out += ") " + d.slice(3, 6);
  if (d.length > 6) out += "-" + d.slice(6, 8);
  if (d.length > 8) out += "-" + d.slice(8, 10);
  return out;
}

/** Полный номер в E.164 или null, если цифр не хватает. */
export function toE164(input: string): string | null {
  const d = phoneDigits(input);
  return d.length === 10 ? `+7${d}` : null;
}
