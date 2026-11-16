import { orderIntervals, zonedParts, type WeekHours } from "@/lib/order/schedule";

/** Правила брони: шаг 30 минут, не раньше чем через час, на 14 дней вперёд, последняя посадка — за час до закрытия зала. */
export const BOOKING = { stepMinutes: 30, leadMinutes: 60, daysAhead: 14, lastSeatingMinutes: 60, maxGuests: 12 } as const;

export type BookingTime = { value: string; time: string };
export type BookingDay = { date: string; label: string; short: string; times: BookingTime[] };

const MINUTE = 60_000;
const pad = (n: number) => String(n).padStart(2, "0");

export function bookingDays(hours: WeekHours, timeZone: string, now: Date): BookingDay[] {
  const step = BOOKING.stepMinutes * MINUTE;
  const earliest = now.getTime() + BOOKING.leadMinutes * MINUTE;
  const days = new Map<string, BookingDay>();
  const today = zonedParts(now, timeZone);
  const todayKey = Date.UTC(today.year, today.month - 1, today.day);
  const weekday = new Intl.DateTimeFormat("ru-RU", { timeZone, weekday: "short" });
  const dayMonth = new Intl.DateTimeFormat("ru-RU", { timeZone, day: "numeric", month: "short" });
  const seen = new Set<number>();

  for (const { start, end } of orderIntervals(hours, timeZone, now, BOOKING.daysAhead)) {
    const last = end.getTime() - BOOKING.lastSeatingMinutes * MINUTE;
    for (let t = Math.ceil(Math.max(start.getTime(), earliest) / step) * step; t <= last; t += step) {
      if (seen.has(t)) continue;
      seen.add(t);
      const at = new Date(t);
      const p = zonedParts(at, timeZone);
      const date = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
      const diff = Math.round((Date.UTC(p.year, p.month - 1, p.day) - todayKey) / 86_400_000);
      if (diff >= BOOKING.daysAhead) continue;
      let day = days.get(date);
      if (!day) {
        const short = diff === 0 ? "Сегодня" : diff === 1 ? "Завтра" : weekday.format(at);
        day = { date, short, label: `${short}, ${dayMonth.format(at)}`, times: [] };
        days.set(date, day);
      }
      day.times.push({ value: at.toISOString(), time: `${pad(p.hour)}:${pad(p.minute)}` });
    }
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function isValidBookingTime(iso: string, hours: WeekHours, timeZone: string, now: Date): boolean {
  return bookingDays(hours, timeZone, now).some((d) => d.times.some((t) => t.value === iso));
}
