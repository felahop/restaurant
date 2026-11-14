import { describe, expect, it } from "vitest";
import { formatPhoneInput, phoneDigits, toE164 } from "@/lib/phone";

/** Имитирует ввод в поле с маской: каждое нажатие добавляет символ к уже отформатированному значению. */
function typeInto(keys: string, start = ""): string {
  let value = start;
  for (const key of keys) value = formatPhoneInput(value + key);
  return value;
}

describe("phone", () => {
  it("нормализует разные способы записи", () => {
    expect(toE164("8 (999) 123-45-67")).toBe("+79991234567");
    expect(toE164("+7 999 123 45 67")).toBe("+79991234567");
    expect(toE164("79991234567")).toBe("+79991234567");
    expect(toE164("9991234567")).toBe("+79991234567");
    expect(toE164("+7 999 123")).toBeNull();
  });

  it("строит маску по мере ввода", () => {
    expect(formatPhoneInput("")).toBe("");
    expect(formatPhoneInput("9")).toBe("+7 (9");
    expect(formatPhoneInput("999")).toBe("+7 (999");
    expect(formatPhoneInput("9991")).toBe("+7 (999) 1");
    expect(formatPhoneInput("99912345")).toBe("+7 (999) 123-45");
    expect(formatPhoneInput("+7 (999) 123-45-678")).toBe("+7 (999) 123-45-67");
  });

  it("посимвольный набор не путает префикс +7 с цифрами номера", () => {
    expect(typeInto("9991234567")).toBe("+7 (999) 123-45-67");
    expect(typeInto("89991234567")).toBe("+7 (999) 123-45-67");
    expect(typeInto("79991234567")).toBe("+7 (999) 123-45-67");
  });

  it("Backspace удаляет цифры, а не застревает на разделителях", () => {
    let value = "+7 (999) 123-45-67";
    const seen: string[] = [];
    for (let i = 0; i < 20 && value; i++) {
      value = formatPhoneInput(value.slice(0, -1));
      seen.push(value);
    }
    expect(value).toBe("");
    expect(seen).toContain("+7 (999");
  });

  it("вставка номера целиком", () => {
    expect(formatPhoneInput("8 999 123 45 67")).toBe("+7 (999) 123-45-67");
    expect(formatPhoneInput("+7 999 1234567")).toBe("+7 (999) 123-45-67");
  });

  it("отбрасывает код страны", () => {
    expect(phoneDigits("+79991234567")).toBe("9991234567");
    expect(phoneDigits("89991234567")).toBe("9991234567");
  });
});
