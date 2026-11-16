import { describe, expect, it } from "vitest";
import { bookingDays, isValidBookingTime } from "@/lib/booking";

const TZ = "Europe/Moscow";
const hours = {
  mon: [{ open: "11:00", close: "23:00" }],
  tue: [{ open: "11:00", close: "23:00" }],
  wed: [{ open: "11:00", close: "23:00" }],
  thu: [{ open: "11:00", close: "23:00" }],
  fri: [{ open: "11:00", close: "00:00" }],
  sat: [{ open: "12:00", close: "00:00" }],
  sun: [],
};

describe("время брони", () => {
  const now = new Date("2026-11-16T15:10:00Z"); // пн 18:10 по Москве

  it("сегодня — не раньше чем через час, шаг 30 минут, последняя посадка за час до закрытия", () => {
    const [today] = bookingDays(hours, TZ, now);
    expect(today!.short).toBe("Сегодня");
    expect(today!.times[0]!.time).toBe("19:30");
    expect(today!.times.at(-1)!.time).toBe("22:00");
  });

  it("выходной день пропускается, всего не больше 14 дней", () => {
    const days = bookingDays(hours, TZ, now);
    expect(days.some((d) => d.date === "2026-11-22")).toBe(false); // воскресенье
    expect(days.length).toBeLessThanOrEqual(14);
    expect(days[1]!.short).toBe("Завтра");
    const friday = days.find((d) => d.date === "2026-11-20")!;
    expect(friday.times.at(-1)!.time).toBe("23:00"); // закрытие в полночь
  });

  it("сервер принимает только время из списка", () => {
    expect(isValidBookingTime("2026-11-16T16:30:00.000Z", hours, TZ, now)).toBe(true); // 19:30
    expect(isValidBookingTime("2026-11-16T15:30:00.000Z", hours, TZ, now)).toBe(false); // 18:30 — меньше часа
    expect(isValidBookingTime("2026-11-16T19:30:00.000Z", hours, TZ, now)).toBe(false); // 22:30 — поздно
  });
});
