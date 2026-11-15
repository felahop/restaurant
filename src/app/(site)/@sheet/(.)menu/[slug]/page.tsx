import { Suspense } from "react";
import { DishLoader, DishSkeleton } from "@/components/menu/DishLoader";
import { DishSheet } from "@/components/menu/DishSheet";

/** Блюдо, открытое из меню или с главной: шторка поверх текущей страницы, URL — /menu/[slug]. */
export default function DishSheetPage({ params }: { params: Promise<{ slug: string }> }) {
  const titleId = "dish-sheet-title";
  return (
    <Suspense fallback={null}>
      <DishSheet titleId={titleId}>
        <Suspense fallback={<DishSkeleton variant="sheet" />}>
          {params.then(({ slug }) => (
            <DishLoader slug={slug} variant="sheet" titleId={titleId} />
          ))}
        </Suspense>
      </DishSheet>
    </Suspense>
  );
}
