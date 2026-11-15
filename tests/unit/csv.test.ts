import { describe, expect, it } from "vitest";
import { csvCell, rubCell, toCsv } from "@/lib/csv";

describe("CSV", () => {
  it("экранирует разделитель, кавычки и переносы", () => {
    expect(csvCell("Вок; острый")).toBe('"Вок; острый"');
    expect(csvCell('Сет "Ужин"')).toBe('"Сет ""Ужин"""');
    expect(csvCell("две\nстроки")).toBe('"две\nстроки"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(42)).toBe("42");
  });

  it("не даёт таблице выполнить формулу из текста", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe("\"'=HYPERLINK(\"\"http://x\"\")\"");
    expect(csvCell("+7999")).toBe("'+7999");
    expect(csvCell("-5")).toBe("'-5");
    expect(csvCell(-5)).toBe("-5"); // числа не трогаем
  });

  it("рубли с запятой и BOM в начале файла", () => {
    expect(rubCell(138_050)).toBe("1380,50");
    expect(rubCell(5)).toBe("0,05");
    expect(rubCell(-1_000)).toBe("-10,00");
    const csv = toCsv(["Номер", "Итого, ₽"], [[1, rubCell(69_000)]]);
    expect(csv.startsWith("﻿Номер;Итого, ₽\r\n1;690,00")).toBe(true);
  });
});
