import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { BookingForm } from "@/components/booking/BookingForm";
import { Eyebrow } from "@/components/ui/Typography";
import { BOOKING, bookingDays } from "@/lib/booking";
import { formatWeekHours } from "@/lib/order/schedule";
import { getUser } from "@/server/auth/user";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: "Бронь столика",
  description: "Забронируйте стол онлайн: выберите день, время и число гостей — перезвоним и подтвердим.",
  alternates: { canonical: "/booking" },
};

async function BookingContent() {
  await connection(); // свободное время зависит от текущего момента
  const [s, user] = await Promise.all([getSettings(), getUser()]);
  return (
    <div className="grid items-start gap-3 lg:grid-cols-[2fr_1fr] lg:gap-4">
      <BookingForm
        days={bookingDays(s.openingHours, s.timezone, new Date())}
        maxGuests={BOOKING.maxGuests}
        phoneDisplay={s.phoneDisplay}
        phoneE164={s.phoneE164}
        defaults={{ name: user?.name ?? "", phone: user?.phone ?? "" }}
      />
      <aside className="flex flex-col gap-1 rounded-card border border-line bg-surface p-2 text-sm text-fg-muted md:p-3">
        <h2 className="text-title font-semibold text-fg">Зал</h2>
        <p className="text-base text-fg">{s.addressFull}</p>
        {s.metro ? <p>м. {s.metro}</p> : null}
        <ul className="mt-1 flex flex-col">
          {formatWeekHours(s.openingHours).map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className="mt-1">Держим стол 15 минут. Опаздываете — позвоните, подождём.</p>
      </aside>
    </div>
  );
}

export default function BookingPage() {
  return (
    <div className="mx-auto flex max-w-site flex-col gap-3 px-2 pt-3 pb-8 md:px-3 md:pt-6 md:pb-12">
      <header className="flex flex-col gap-1">
        <Eyebrow>Ждём в зале у огня</Eyebrow>
        <h1 className="font-display text-h1 text-fg">Бронь столика</h1>
      </header>
      <Suspense fallback={<div className="h-60 animate-pulse rounded-card bg-surface" aria-busy="true" />}>
        <BookingContent />
      </Suspense>
    </div>
  );
}
