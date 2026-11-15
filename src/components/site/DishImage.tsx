import Image from "next/image";
import { cn } from "@/lib/cn";

type DishImageProps = {
  name: string;
  imageUrl?: string | null;
  kanji?: string | null;
  sizes?: string;
  priority?: boolean;
  className?: string;
  dimmed?: boolean;
  /** Миниатюра (корзина): без подписи, только иероглиф. */
  compact?: boolean;
};

/** Фото блюда 4:3 или заглушка в палитре сайта с названием блюда. */
export function DishImage({ name, imageUrl, kanji, sizes, priority, className, dimmed, compact }: DishImageProps) {
  return (
    <div className={cn("relative aspect-4/3 overflow-hidden bg-coal", className)}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes={sizes ?? "(min-width: 1280px) 280px, (min-width: 768px) 45vw, 100vw"}
          priority={priority}
          className={cn(
            "object-cover transition-transform duration-250 ease-out group-hover:scale-104",
            dimmed && "opacity-50 grayscale",
          )}
        />
      ) : (
        <div
          role="img"
          aria-label={`${name} — фото скоро появится`}
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[radial-gradient(ellipse_at_50%_42%,var(--color-ash)_0%,var(--color-coal)_62%,var(--color-ink)_100%)] transition-transform duration-250 ease-out group-hover:scale-104",
            dimmed && "opacity-50",
          )}
        >
          <svg
            viewBox="0 0 200 150"
            className="absolute inset-0 size-full text-sesame"
            aria-hidden="true"
            focusable="false"
          >
            <ellipse
              cx="100"
              cy="72"
              rx="62"
              ry="40"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.22"
              strokeWidth="1"
            />
            <ellipse
              cx="100"
              cy="72"
              rx="44"
              ry="28"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.14"
              strokeWidth="1"
            />
            <path
              d="M150 34 L178 18"
              stroke="currentColor"
              strokeOpacity="0.3"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M154 40 L182 26"
              stroke="currentColor"
              strokeOpacity="0.3"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span
            aria-hidden="true"
            className={cn("relative font-kanji text-paper opacity-20", compact ? "text-h3" : "text-h1")}
          >
            {kanji ?? "食"}
          </span>
          {compact ? null : (
            <span
              aria-hidden="true"
              className="relative line-clamp-2 max-w-[80%] text-center text-xs font-medium tracking-eyebrow text-sesame uppercase"
            >
              {name}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
