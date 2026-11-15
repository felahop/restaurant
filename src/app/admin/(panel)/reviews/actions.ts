"use server";

import { updateTag } from "next/cache";
import { ok, type ActionResult } from "@/lib/admin/result";
import { guardAction } from "@/server/admin/guard";
import { REVIEWS_TAG } from "@/server/content";
import { db } from "@/server/db";

export async function setReviewPublishedAction(id: string, published: boolean): Promise<ActionResult> {
  const g = await guardAction("reviews");
  if ("denied" in g) return g.denied;
  await db.review.update({ where: { id }, data: { isPublished: Boolean(published), publishedAt: published ? new Date() : null } });
  updateTag(REVIEWS_TAG);
  return ok(published ? "Отзыв опубликован на главной" : "Отзыв снят с публикации");
}

export async function deleteReviewAction(id: string): Promise<ActionResult> {
  const g = await guardAction("reviews");
  if ("denied" in g) return g.denied;
  await db.review.delete({ where: { id } });
  updateTag(REVIEWS_TAG);
  return ok("Отзыв удалён");
}
