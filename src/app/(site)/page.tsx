import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { FindUsSection } from "@/components/home/FindUsSection";
import { GallerySection } from "@/components/home/GallerySection";
import { Hero } from "@/components/home/Hero";
import { HitsSection } from "@/components/home/HitsSection";
import { InfoStrip } from "@/components/home/InfoStrip";
import { PromotionsSection } from "@/components/home/PromotionsSection";
import { ReviewsSection } from "@/components/home/ReviewsSection";
import { StorySection } from "@/components/home/StorySection";
import { restaurant } from "@/config/restaurant";
import { gallery, hero, promotions, reviews } from "@/data/home";
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

export default function HomePage() {
  // TODO(этапы 6–7): акции и отзывы из админ-панели.
  return (
    <>
      <Hero />
      <InfoStrip />
      <Suspense fallback={<HitsSection />}>
        <Hits />
      </Suspense>
      <PromotionsSection items={promotions} />
      <StorySection />
      <GallerySection items={gallery} />
      <ReviewsSection items={reviews} />
      <FindUsSection />
    </>
  );
}
