import "server-only";
import type { Capacity } from "@/lib/booking";
import { BOOKING } from "@/lib/booking";
import { db } from "@/server/db";
import { getSettings } from "@/server/settings";

/** Действующие брони (новые и подтверждённые) на ближайшие дни — для расчёта свободных мест. */
export async function bookingCapacity(now = new Date()): Promise<Capacity> {
  const s = await getSettings();
  const from = new Date(now.getTime() - s.bookingDurationMinutes * 60_000);
  const to = new Date(now.getTime() + (BOOKING.daysAhead + 1) * 86_400_000);
  const occupied = await db.reservation.findMany({
    where: { status: { in: ["NEW", "CONFIRMED"] }, startsAt: { gte: from, lt: to } },
    select: { startsAt: true, guests: true },
  });
  return { seats: s.bookingCapacity, durationMinutes: s.bookingDurationMinutes, occupied };
}
