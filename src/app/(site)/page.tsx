import type { Metadata } from "next";
import { FindUsSection } from "@/components/home/FindUsSection";
import { GallerySection } from "@/components/home/GallerySection";
import { Hero } from "@/components/home/Hero";
import { HitsSection } from "@/components/home/HitsSection";
import { InfoStrip } from "@/components/home/InfoStrip";
import { PromotionsSection } from "@/components/home/PromotionsSection";
import { ReviewsSection } from "@/components/home/ReviewsSection";
import { StorySection } from "@/components/home/StorySection";
import { restaurant } from "@/config/restaurant";
import { demoDishes } from "@/data/demo-dishes";
import { gallery, hero, promotions, reviews } from "@/data/home";

export const metadata: Metadata = {
  title: { absolute: `${restaurant.name} — ${restaurant.tagline.toLowerCase()}, ${restaurant.city}` },
  description: hero.lead,
  openGraph: {
    title: `${restaurant.name} — ${hero.title.toLowerCase()}`,
    description: hero.lead,
  },
};

export default function HomePage() {
  // TODO(этап 3): хиты из базы (Dish.isHit), этапы 6–7: акции и отзывы из админки.
  const hits = demoDishes.filter((d) => d.isHit).slice(0, 4);
  return (
    <>
      <Hero />
      <InfoStrip />
      <HitsSection dishes={hits} />
      <PromotionsSection items={promotions} />
      <StorySection />
      <GallerySection items={gallery} />
      <ReviewsSection items={reviews} />
      <FindUsSection />
    </>
  );
}
