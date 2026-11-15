import { describe, expect, it } from "vitest";
import {
  availableSlots,
  isOpenAt,
  isValidSlot,
  nextOpening,
  zonedParts,
  zonedTimeToUtc,
  type WeekHours,
} from "@/lib/order/schedule";

const TZ = "Europe/Moscow"; // UTC+3 без перехода на летнее время
const hours: WeekHours = {
  mon: [{ open: "11:00", close: "22:30" }],
  tue: [{ open: "11:00", close: "22:30" }],
  wed: [{ open: "11:00", close: "22:30" }],
  thu: [{ open: "11:00", close: "22:30" }],
  fri: [{ open: "11:00", close: "01:00" }],
  sat: [{ open: "12:00", close: "23:30" }],
  sun: [{ open: "12:00", close: "22:30" }],
};
const opts = (now: string) => ({
  hours,
  timeZone: TZ,
  now: new Date(now),
  stepMinutes: 15,
  leadMinutes: 45,
  daysAhead: 2,
});

describe("часовой пояс", () => {
  it("местное время ↔ UTC", () => {
    expect(zonedTimeToUtc(2026, 11, 15, 12, 0, TZ).toISOString()).toBe("2026-11-15T09:00:00.000Z");
    expect(zonedParts(new Date("2026-11-15T21:30:00Z"), TZ)).toMatchObject({
      day: 16,
      hour: 0,
      minute: 30,
      weekday: "mon",
    });
    expect(zonedTimeToUtc(2026, 11, 15, 12, 0, "Asia/Almaty").toISOString()).toBe("2026-11-15T07:00:00.000Z");
  });
});

describe("часы приёма", () => {
  it("открыто и закрыто", () => {
    // 2026-11-16 — понедельник.
    expect(isOpenAt(hours, TZ, new Date("2026-11-16T09:00:00Z"))).toBe(true); // 12:00
    expect(isOpenAt(hours, TZ, new Date("2026-11-16T07:30:00Z"))).toBe(false); // 10:30
    expect(isOpenAt(hours, TZ, new Date("2026-11-16T19:45:00Z"))).toBe(false); // 22:45
  });

  it("работа после полуночи учитывается в следующих сутках", () => {
    // Пятница 20.11 до 01:00 субботы: 00:30 субботы — открыто, 01:30 — закрыто.
    expect(isOpenAt(hours, TZ, new Date("2026-11-20T21:30:00Z"))).toBe(true);
    expect(isOpenAt(hours, TZ, new Date("2026-11-20T22:30:00Z"))).toBe(false);
  });

  it("ближайшее открытие", () => {
    expect(nextOpening(hours, TZ, new Date("2026-11-16T05:00:00Z"))?.label).toBe("сегодня в 11:00");
    expect(nextOpening(hours, TZ, new Date("2026-11-16T20:00:00Z"))?.label).toBe("завтра в 11:00");
  });
});

describe("слоты ко времени", () => {
  it("первый слот: сейчас + 45 минут, округлено к шагу 15 минут", () => {
    const slots = availableSlots(opts("2026-11-16T09:07:00Z")); // пн 12:07
    expect(slots[0]).toMatchObject({ label: "Сегодня, 13:00", day: "today" });
    expect(slots.at(-1)).toMatchObject({ label: "Завтра, 22:30", day: "tomorrow" });
  });

  it("до открытия: первый слот через 45 минут после открытия", () => {
    const slots = availableSlots(opts("2026-11-16T03:00:00Z")); // пн 06:00
    expect(slots[0]?.label).toBe("Сегодня, 11:45");
  });

  it("после закрытия — только завтра", () => {
    const slots = availableSlots(opts("2026-11-16T20:00:00Z")); // пн 23:00
    expect(slots.every((s) => s.day === "tomorrow")).toBe(true);
    expect(slots[0]?.label).toBe("Завтра, 11:45");
  });

  it("проверка слота сервером", () => {
    const o = opts("2026-11-16T09:07:00Z");
    expect(isValidSlot("2026-11-16T10:00:00.000Z", o)).toBe(true); // 13:00
    expect(isValidSlot("2026-11-16T09:30:00.000Z", o)).toBe(false); // 12:30 — меньше 45 минут
    expect(isValidSlot("2026-11-16T10:05:00.000Z", o)).toBe(false); // не по шагу
    expect(isValidSlot("2026-11-18T10:00:00.000Z", o)).toBe(false); // послезавтра
  });
});

import { formatWeekHours } from "@/lib/order/schedule";

describe("часы для показа", () => {
  it("склеивает одинаковые дни", () => {
    expect(formatWeekHours(hours)).toEqual(["Пн–Чт 11:00–22:30", "Пт 11:00–01:00", "Сб 12:00–23:30", "Вс 12:00–22:30"]);
    expect(formatWeekHours({ ...hours, mon: [] })).toEqual([
      "Пн выходной",
      "Вт–Чт 11:00–22:30",
      "Пт 11:00–01:00",
      "Сб 12:00–23:30",
      "Вс 12:00–22:30",
    ]);
  });
});
