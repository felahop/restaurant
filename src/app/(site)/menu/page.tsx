import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { MenuBrowser } from "@/components/menu/MenuBrowser";
import { DishCardSkeleton } from "@/components/site/DishCard";
import { Eyebrow } from "@/components/ui/Typography";
import { restaurant } from "@/config/restaurant";
import { getMenu } from "@/server/menu";

export const metadata: Metadata = {
  title: "Меню",
  description: `Меню ${restaurant.name}: рамен, вок, бао и димсамы, роллы, супы, напитки и десерты. Доставка за ${restaurant.delivery.etaMinutes.from}–${restaurant.delivery.etaMinutes.to} минут.`,
  alternates: { canonical: "/menu" },
};

async function MenuData() {
  await connection(); // меню читается из базы при запросе (и кэшируется), а не при сборке
  const categories = await getMenu();
  return <MenuBrowser categories={categories} />;
}

function MenuSkeleton() {
  return (
    <div className="mx-auto max-w-site px-2 py-4 md:px-3" aria-busy="true" aria-label="Загружаем меню">
      <div className="mb-3 h-6 w-full max-w-60 animate-pulse rounded-full bg-surface" />
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <DishCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function MenuPage() {
  return (
    <>
      <header className="mx-auto flex max-w-site flex-col gap-1 px-2 pt-4 pb-2 md:px-3 md:pt-6">
        <Eyebrow>Доставка и самовывоз</Eyebrow>
        <h1 className="font-display text-h1 text-fg">Меню</h1>
      </header>
      <Suspense fallback={<MenuSkeleton />}>
        <MenuData />
      </Suspense>
    </>
  );
}
