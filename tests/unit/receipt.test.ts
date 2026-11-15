import { describe, expect, it } from "vitest";
import { buildReceiptLines, distribute, receiptSum } from "@/lib/payments/receipt";

describe("чек 54-ФЗ: позиции", () => {
  it("без скидок — цены как в заказе, доставка отдельной позицией", () => {
    const lines = buildReceiptLines({
      lines: [
        { name: "Тонкоцу рамен", quantity: 2, lineTotal: 138_000 },
        { name: "Гёдза", quantity: 1, lineTotal: 45_000 },
      ],
      deliveryFee: 25_000,
      total: 208_000,
    });
    expect(lines).toEqual([
      { description: "Тонкоцу рамен", quantity: 2, unitPrice: 69_000, kind: "dish" },
      { description: "Гёдза", quantity: 1, unitPrice: 45_000, kind: "dish" },
      { description: "Доставка", quantity: 1, unitPrice: 25_000, kind: "delivery" },
    ]);
  });

  it("скидка и бонусы делятся по блюдам, сумма чека ровно равна платежу", () => {
    const input = {
      lines: [
        { name: "Рамен", quantity: 3, lineTotal: 207_000 },
        { name: "Бао", quantity: 2, lineTotal: 98_000 },
        { name: "Чай", quantity: 1, lineTotal: 25_000 },
      ],
      deliveryFee: 15_000,
      total: 345_000 - 33_001 - 10_000, // 10 % с копейками и 100 ₽ бонусами
    };
    const lines = buildReceiptLines(input);
    expect(receiptSum(lines)).toBe(input.total);
    expect(lines.every((l) => Number.isInteger(l.unitPrice) && l.unitPrice > 0)).toBe(true);
    expect(lines.at(-1)).toMatchObject({ description: "Доставка", unitPrice: 15_000 });
  });

  it("распределение по наибольшим остаткам", () => {
    expect(distribute(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(distribute(0, [5, 5])).toEqual([0, 0]);
    expect(distribute(10, [0, 0])).toEqual([0, 0]);
  });

  it("длинное название обрезается до 128 символов", () => {
    const [line] = buildReceiptLines({ lines: [{ name: "Б".repeat(200), quantity: 1, lineTotal: 100 }], deliveryFee: 0, total: 100 });
    expect(line!.description).toHaveLength(128);
  });
});

describe("чек 54-ФЗ: объект receipt для ЮKassa", async () => {
  const { receiptBody } = await import("@/server/payments/yookassa");
  const cfg = { vatCode: 1, taxSystemCode: 2, paymentSubject: "commodity", paymentMode: "full_prepayment" };
  const lines = buildReceiptLines({ lines: [{ name: "Рамен", quantity: 2, lineTotal: 138_000 }], deliveryFee: 25_000, total: 163_000 });

  it("поля по схеме ReceiptData: позиции, НДС, предмет и способ расчёта, почта", () => {
    const body = receiptBody(163_000, { email: "guest@example.com", phone: null, lines }, cfg);
    expect(body).toEqual({
      customer: { email: "guest@example.com" },
      items: [
        { description: "Рамен", quantity: 2, amount: { value: "690.00", currency: "RUB" }, vat_code: 1, payment_subject: "commodity", payment_mode: "full_prepayment", measure: "piece" },
        { description: "Доставка", quantity: 1, amount: { value: "250.00", currency: "RUB" }, vat_code: 1, payment_subject: "service", payment_mode: "full_prepayment", measure: "piece" },
      ],
      tax_system_code: 2,
    });
  });

  it("телефон без «+», сумма чека обязана совпасть с платежом", () => {
    expect(receiptBody(163_000, { email: null, phone: "+79991234567", lines }, cfg).customer).toEqual({ phone: "79991234567" });
    expect(() => receiptBody(163_100, { email: "a@b.ru", phone: null, lines }, cfg)).toThrow();
  });
});
