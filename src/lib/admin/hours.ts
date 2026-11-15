import { z } from "zod";

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const WEEKDAY_LABELS: Record<(typeof WEEKDAYS)[number], string> = {
  mon: "Понедельник",
  tue: "Вторник",
  wed: "Среда",
  thu: "Четверг",
  fri: "Пятница",
  sat: "Суббота",
  sun: "Воскресенье",
};

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Время в формате ЧЧ:ММ");
const interval = z.object({ open: time, close: time }).refine((i) => i.open !== i.close, "Открытие и закрытие совпадают");

/** Часы по дням: пустой массив — выходной. Закрытие раньше открытия — работа после полуночи. */
export const weekHoursSchema = z.object(
  Object.fromEntries(WEEKDAYS.map((d) => [d, z.array(interval).max(3)])) as Record<(typeof WEEKDAYS)[number], z.ZodArray<typeof interval>>,
);
export type WeekHoursInput = z.infer<typeof weekHoursSchema>;
