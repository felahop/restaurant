import Image from "next/image";
import { cn } from "@/lib/cn";

export type FrameImage = { src: string; alt: string } | null;

type PhotoFrameProps = {
  image: FrameImage;
  /** Подпись заглушки: что будет на фото. */
  caption: string;
  kanji?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** Класс пропорций контейнера, например aspect-4/5. */
  aspect?: string;
};

/**
 * Фото или заглушка в палитре сайта. Заглушка честно подписана — что сюда поставить.
 * Цвета берутся из семантических токенов, поэтому на светлой секции заглушка светлая.
 */
export function PhotoFrame({
  image,
  caption,
  kanji = "炭",
  sizes,
  priority,
  className,
  aspect = "aspect-4/3",
}: PhotoFrameProps) {
  return (
    <div className={cn("group relative overflow-hidden rounded-card bg-surface-2", aspect, className)}>
      {image ? (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes ?? "(min-width: 1024px) 50vw, 100vw"}
          priority={priority}
          className="object-cover transition-transform duration-250 ease-out group-hover:scale-104"
        />
      ) : (
        <div
          role="img"
          aria-label={`${caption} — фото скоро появится`}
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,var(--surface)_0%,var(--surface-2)_70%)] transition-transform duration-250 ease-out group-hover:scale-104"
        >
          <span
            aria-hidden="true"
            className="absolute -right-1 -bottom-3 font-kanji text-kanji-sm text-fg opacity-8 select-none"
          >
            {kanji}
          </span>
          {/* Тонкая штриховка, как бумага под тушь. */}
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[repeating-linear-gradient(-35deg,transparent_0_23px,var(--line)_23px_24px)] opacity-60"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-2 left-2 max-w-[70%] text-xs font-semibold tracking-eyebrow text-fg-muted uppercase"
          >
            {caption}
          </span>
        </div>
      )}
    </div>
  );
}
