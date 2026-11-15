import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/server/db";

export const PROMOTIONS_TAG = "promotions";
export const REVIEWS_TAG = "reviews";

/** Активные акции и баннеры для сайта. Даты проверяются при показе (кэш — минуты). */
export async function getActivePromotions() {
  "use cache";
  cacheTag(PROMOTIONS_TAG);
  cacheLife("minutes");
  const now = new Date();
  const rows = await db.promotion.findMany({
    where: {
      isActive: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return rows.map((p) => ({
    id: p.id,
    kind: p.kind,
    badge: p.badge,
    title: p.title,
    text: p.text,
    period: p.period,
    kanji: p.kanji,
    imageUrl: p.imageUrl,
    ctaLabel: p.ctaLabel,
    ctaHref: p.ctaHref,
  }));
}

export type ActivePromotion = Awaited<ReturnType<typeof getActivePromotions>>[number];

/** Опубликованные отзывы для главной. */
export async function getPublishedReviews(limit = 6) {
  "use cache";
  cacheTag(REVIEWS_TAG);
  cacheLife("hours");
  const rows = await db.review.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: { id: true, authorName: true, rating: true, text: true, publishedAt: true },
  });
  return rows.map((r) => ({ ...r, publishedAt: r.publishedAt?.toISOString() ?? null }));
}

export type PublishedReview = Awaited<ReturnType<typeof getPublishedReviews>>[number];
