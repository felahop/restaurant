import type { Metadata } from "next";
import { Suspense } from "react";
import { DishLoader, DishSkeleton } from "@/components/menu/DishLoader";
import { restaurant } from "@/config/restaurant";
import { formatRub } from "@/lib/money";
import { getDishBySlug } from "@/server/menu";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const dish = await getDishBySlug(slug);
  if (!dish) return { title: "Блюдо не найдено" };
  const description = `${dish.description} ${dish.portion}, ${formatRub(dish.price)}. Доставка и самовывоз.`;
  return {
    title: dish.name,
    description,
    alternates: { canonical: `/menu/${dish.slug}` },
    openGraph: {
      title: `${dish.name} — ${restaurant.name}`,
      description,
      images: dish.imageUrl ? [dish.imageUrl] : undefined,
    },
  };
}

export default function DishPage({ params }: Props) {
  return (
    <div className="mx-auto max-w-site px-2 pt-2 pb-6 md:px-3 md:pt-4 md:pb-10">
      <Suspense fallback={<DishSkeleton variant="page" />}>
        {params.then(({ slug }) => (
          <DishLoader slug={slug} variant="page" />
        ))}
      </Suspense>
    </div>
  );
}
