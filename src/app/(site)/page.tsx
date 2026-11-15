import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { FindUsSection, SiteFindUsSection } from "@/components/home/FindUsSection";
import { GallerySection } from "@/components/home/GallerySection";
import { Hero } from "@/components/home/Hero";
import { HitsSection } from "@/components/home/HitsSection";
import { InfoStrip, SiteInfoStrip } from "@/components/home/InfoStrip";
import { PromoBanners } from "@/components/home/PromoBanners";
import { SitePromotions } from "@/components/home/PromotionsSection";
import { SiteReviews } from "@/components/home/ReviewsSection";
import { StorySection } from "@/components/home/StorySection";
import { restaurant } from "@/config/restaurant";
import { gallery, hero } from "@/data/home";
import { getHits } from "@/server/menu";

export const metadata: Metadata = {
  title: { absolute: `${restaurant.name} — ${restaurant.tagline.toLowerCase()}, ${restaurant.city}` },
  description: hero.lead,
  openGraph: {
    title: `${restaurant.name} — ${hero.title.toLowerCase()}`,
    description: hero.lead,
  },
};

/** Хиты из базы: блюда с меткой «Хит», которую ставят в админ-панели. */
async function Hits() {
  await connection();
  const hits = await getHits(4);
  return <HitsSection dishes={hits} />;
}

/**
 * Главная. Статичная оболочка (первый экран, история, галерея) собирается заранее,
 * а данные из админ-панели — контакты, хиты, баннеры, акции, отзывы — приходят потоком.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <Suspense fallback={<InfoStrip info={null} />}>
        <SiteInfoStrip />
      </Suspense>
      <Suspense fallback={null}>
        <PromoBanners className="pt-4 md:pt-6" />
      </Suspense>
      <Suspense fallback={<HitsSection />}>
        <Hits />
      </Suspense>
      <Suspense fallback={null}>
        <SitePromotions />
      </Suspense>
      <StorySection />
      <GallerySection items={gallery} />
      <Suspense fallback={null}>
        <SiteReviews />
      </Suspense>
      <Suspense fallback={<FindUsSection info={null} />}>
        <SiteFindUsSection />
      </Suspense>
    </>
  );
}
