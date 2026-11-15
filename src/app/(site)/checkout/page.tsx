import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { Checkout } from "@/components/checkout/Checkout";
import { Eyebrow } from "@/components/ui/Typography";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: "Корзина и оформление",
  robots: { index: false, follow: false },
};

async function CheckoutLoader() {
  await connection();
  const s = await getSettings();
  return (
    <Checkout
      restaurant={{
        addressShort: s.addressShort,
        metro: s.metro,
        phoneDisplay: s.phoneDisplay,
        phoneE164: s.phoneE164,
      }}
    />
  );
}

export default function CheckoutPage() {
  return (
    <>
      <header className="mx-auto flex max-w-site flex-col gap-1 px-2 pt-3 pb-2 md:px-3 md:pt-6 md:pb-3">
        <Eyebrow>Три шага до ужина</Eyebrow>
        <h1 className="font-display text-h1 text-fg">Корзина</h1>
      </header>
      <Suspense
        fallback={<div className="mx-auto h-60 max-w-site animate-pulse rounded-card bg-surface" aria-busy="true" />}
      >
        <CheckoutLoader />
      </Suspense>
    </>
  );
}
