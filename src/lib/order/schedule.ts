/**
 * Часы приёма заказов и слоты «ко времени» в часовом поясе ресторана.
 * Без сторонних библиотек: смещение пояса берётся из Intl.
 */

export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type OpeningInterval = { open: string; close: string };
export type WeekHours = Partial<Record<WeekdayKey, OpeningInterval[]>>;

const WEEKDAYS: WeekdayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MINUTE = 60_000;

type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number; weekday: WeekdayKey };

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      weekday: "short",
      hourCycle: "h23",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = Object.fromEntries(
    formatter(timeZone)
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const weekday = (parts.weekday ?? "Sun").slice(0, 3).toLowerCase() as WeekdayKey;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekday,
  };
}

/** Местное время ресторана → момент времени (UTC). */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  let guess = asUtc;
  for (let i = 0; i < 2; i++) {
    const p = zonedParts(new Date(guess), timeZone);
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess += asUtc - shown;
  }
  return new Date(guess);
}

function parseHm(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Абсолютные интервалы приёма заказов, начиная с дня до «сегодня» (для работы после полуночи). */
export function orderIntervals(
  hours: WeekHours,
  timeZone: string,
  now: Date,
  daysAhead: number,
): { start: Date; end: Date }[] {
  const today = zonedParts(now, timeZone);
  const result: { start: Date; end: Date }[] = [];
  for (let offset = -1; offset < daysAhead; offset++) {
    const base = new Date(Date.UTC(today.year, today.month - 1, today.day + offset));
    const y = base.getUTCFullYear();
    const m = base.getUTCMonth() + 1;
    const d = base.getUTCDate();
    const weekday = WEEKDAYS[base.getUTCDay()]!;
    for (const interval of hours[weekday] ?? []) {
      const open = parseHm(interval.open);
      let close = parseHm(interval.close);
      if (close <= open) close += 24 * 60; // закрытие после полуночи
      const start = zonedTimeToUtc(y, m, d, 0, 0, timeZone);
      result.push({
        start: new Date(start.getTime() + open * MINUTE),
        end: new Date(start.getTime() + close * MINUTE),
      });
    }
  }
  return result.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function isOpenAt(hours: WeekHours, timeZone: string, at: Date): boolean {
  return orderIntervals(hours, timeZone, at, 1).some((i) => at >= i.start && at < i.end);
}

export type Slot = { value: string; label: string; day: "today" | "tomorrow" | "later"; time: string };

export type ScheduleOptions = {
  hours: WeekHours;
  timeZone: string;
  now: Date;
  stepMinutes: number;
  leadMinutes: number;
  daysAhead: number;
};

function dayLabel(date: Date, now: Date, timeZone: string): Slot["day"] {
  const a = zonedParts(date, timeZone);
  const b = zonedParts(now, timeZone);
  const diff = Math.round((Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)) / 86_400_000);
  return diff === 0 ? "today" : diff === 1 ? "tomorrow" : "later";
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Слоты «ко времени»: шаг stepMinutes, не раньше now + lead и открытия + lead, не позже закрытия. */
export function availableSlots(opts: ScheduleOptions): Slot[] {
  const { hours, timeZone, now, stepMinutes, leadMinutes, daysAhead } = opts;
  const step = stepMinutes * MINUTE;
  const lead = leadMinutes * MINUTE;
  const slots: Slot[] = [];
  const seen = new Set<number>();
  for (const { start, end } of orderIntervals(hours, timeZone, now, daysAhead)) {
    const earliest = Math.max(start.getTime() + lead, now.getTime() + lead);
    let t = Math.ceil(earliest / step) * step;
    for (; t <= end.getTime(); t += step) {
      if (seen.has(t)) continue;
      seen.add(t);
      const date = new Date(t);
      const day = dayLabel(date, now, timeZone);
      if (day === "later" && daysAhead <= 2) continue;
      const p = zonedParts(date, timeZone);
      const time = `${pad(p.hour)}:${pad(p.minute)}`;
      const prefix = day === "today" ? "Сегодня" : day === "tomorrow" ? "Завтра" : `${pad(p.day)}.${pad(p.month)}`;
      slots.push({ value: date.toISOString(), label: `${prefix}, ${time}`, day, time });
    }
  }
  return slots.sort((a, b) => a.value.localeCompare(b.value));
}

export function isValidSlot(slotIso: string, opts: ScheduleOptions): boolean {
  return availableSlots(opts).some((s) => s.value === slotIso);
}

/** Ближайшее открытие (для сообщения «Кухня откроется в 11:00»). */
export function nextOpening(hours: WeekHours, timeZone: string, now: Date): { at: Date; label: string } | null {
  const next = orderIntervals(hours, timeZone, now, 8).find((i) => i.start > now);
  if (!next) return null;
  const p = zonedParts(next.start, timeZone);
  const day = dayLabel(next.start, now, timeZone);
  const prefix = day === "today" ? "сегодня" : day === "tomorrow" ? "завтра" : `${pad(p.day)}.${pad(p.month)}`;
  return { at: next.start, label: `${prefix} в ${pad(p.hour)}:${pad(p.minute)}` };
}

const DAY_ORDER: WeekdayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_SHORT: Record<WeekdayKey, string> = {
  mon: "Пн",
  tue: "Вт",
  wed: "Ср",
  thu: "Чт",
  fri: "Пт",
  sat: "Сб",
  sun: "Вс",
};

/** «Пн–Чт 11:00–22:30», «Пт 11:00–23:30», «Вс выходной» — подряд идущие дни с одинаковыми часами склеиваются. */
export function formatWeekHours(hours: WeekHours): string[] {
  const text = (d: WeekdayKey) => {
    const list = hours[d] ?? [];
    return list.length ? list.map((i) => `${i.open}–${i.close}`).join(", ") : "выходной";
  };
  const lines: string[] = [];
  let start = 0;
  for (let i = 1; i <= DAY_ORDER.length; i++) {
    const prev = DAY_ORDER[i - 1]!;
    const cur = DAY_ORDER[i];
    if (cur && text(cur) === text(prev)) continue;
    const from = DAY_ORDER[start]!;
    const label = start === i - 1 ? DAY_SHORT[from] : `${DAY_SHORT[from]}–${DAY_SHORT[prev]}`;
    lines.push(`${label} ${text(prev)}`);
    start = i;
  }
  return lines;
}
