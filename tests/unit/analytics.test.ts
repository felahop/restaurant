import { describe, expect, it } from "vitest";
import { bucketize, delta, niceMax, parsePeriod, periodRange, summarize } from "@/lib/admin/analytics";

const TZ = "Europe/Moscow"; // UTC+3 без перехода на летнее время

describe("periodRange", () => {
  const now = new Date("2026-11-13T12:30:00Z"); // 15:30 по Москве, пятница

  it("сегодня: местные сутки по часам, сравнение с тем же временем вчера", () => {
    const r = periodRange("day", now, TZ);
    expect(r.from.toISOString()).toBe("2026-11-12T21:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-11-13T21:00:00.000Z");
    expect(r.buckets).toHaveLength(24);
    expect(r.buckets[15]!.label).toBe("15:00–16:00");
    expect(r.buckets[15]!.tick).toBe("15:00");
    expect(r.buckets[1]!.tick).toBeNull();
    expect(r.buckets[3]!.minor).toBe(true);
    expect(r.buckets[6]!.minor).toBe(false);
    expect(r.prevFrom.toISOString()).toBe("2026-11-11T21:00:00.000Z");
    expect(r.prevTo.toISOString()).toBe("2026-11-12T12:30:00.000Z");
  });

  it("7 дней: включая сегодня, прошлый период — 7 дней до него", () => {
    const r = periodRange("week", now, TZ);
    expect(r.buckets).toHaveLength(7);
    expect(r.from.toISOString()).toBe("2026-11-06T21:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-11-13T21:00:00.000Z");
    expect(r.prevFrom.toISOString()).toBe("2026-10-30T21:00:00.000Z");
    expect(r.prevTo).toEqual(r.from);
    expect(r.buckets.at(-1)!.tick).toBe("пт");
  });

  it("30 дней: подписи каждые пять дней, последняя — сегодня", () => {
    const r = periodRange("month", now, TZ);
    expect(r.buckets).toHaveLength(30);
    expect(r.buckets.at(-1)!.tick).toBe("13.11");
    expect(r.buckets.filter((b) => b.tick).length).toBe(6);
    expect(r.from.toISOString()).toBe("2026-10-14T21:00:00.000Z");
  });

  it("неизвестный период — сегодня", () => {
    expect(parsePeriod("year")).toBe("day");
    expect(parsePeriod("month")).toBe("month");
  });
});

describe("bucketize", () => {
  it("раскладывает заказы по часам и отбрасывает лишние", () => {
    const r = periodRange("day", new Date("2026-11-13T12:30:00Z"), TZ);
    const values = bucketize(
      [
        { createdAt: new Date("2026-11-13T09:05:00Z"), total: 150_000 }, // 12:05
        { createdAt: new Date("2026-11-13T09:55:00Z"), total: 50_000 }, // 12:55
        { createdAt: new Date("2026-11-12T20:59:00Z"), total: 999_00 }, // вчера
        { createdAt: new Date("2026-11-13T21:00:00Z"), total: 999_00 }, // завтра
      ],
      r,
    );
    expect(values[12]).toMatchObject({ revenue: 200_000, orders: 2 });
    expect(values.reduce((s, v) => s + v.orders, 0)).toBe(2);
  });
});

describe("показатели", () => {
  it("средний чек округляется до рубля, пустой период — ноль", () => {
    expect(summarize(281_979, 2)).toEqual({ revenue: 281_979, orders: 2, average: 141_000 });
    expect(summarize(0, 0).average).toBe(0);
  });

  it("изменение к прошлому периоду", () => {
    expect(delta(120, 100)).toBeCloseTo(0.2);
    expect(delta(50, 100)).toBeCloseTo(-0.5);
    expect(delta(10, 0)).toBeNull();
  });

  it("верх оси — круглое число рублей", () => {
    expect(niceMax(0)).toBe(100_000);
    expect(niceMax(1_870_00)).toBe(2_000_00);
    expect(niceMax(2_100_00)).toBe(2_500_00);
    expect(niceMax(31_000_00)).toBe(50_000_00);
    expect(niceMax(100_000_00)).toBe(100_000_00);
  });
});
