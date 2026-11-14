import { PhotoFrame } from "@/components/site/PhotoFrame";
import { SectionHeading } from "@/components/ui/Typography";
import type { GalleryItem } from "@/data/home";
import { cn } from "@/lib/cn";

const spanClass = {
  wide: "col-span-2",
  tall: "row-span-2",
} as const;

/** Галерея 8–12 фото: плотная сетка с крупными акцентами. */
export function GallerySection({ items }: { items: GalleryItem[] }) {
  return (
    <section aria-labelledby="gallery-title" className="py-8 md:py-12">
      <div data-reveal className="mx-auto flex max-w-site flex-col gap-4 px-2 md:px-3">
        <SectionHeading id="gallery-title" eyebrow="Атмосфера" title="Зал, кухня и огонь" />
        <ul className="grid grid-flow-row-dense auto-rows-[120px] grid-cols-2 gap-1 sm:auto-rows-[160px] md:auto-rows-[200px] md:grid-cols-4 md:gap-2">
          {items.map((item) => (
            <li key={item.id} className={cn("min-w-0", item.span && spanClass[item.span])}>
              <PhotoFrame
                image={item.image}
                caption={item.caption}
                kanji={item.kanji}
                aspect="h-full"
                sizes="(min-width: 768px) 25vw, 50vw"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
