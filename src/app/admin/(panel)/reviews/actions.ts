"use server";

import { updateTag } from "next/cache";
import { ok, type ActionResult } from "@/lib/admin/result";
import { audit } from "@/server/admin/audit";
import { guardAction } from "@/server/admin/guard";
import { REVIEWS_TAG } from "@/server/content";
import { db } from "@/server/db";

export async function setReviewPublishedAction(id: string, published: boolean): Promise<ActionResult> {
  const g = await guardAction("reviews");
  if ("denied" in g) return g.denied;
  const r = await db.review.update({
    where: { id },
    data: { isPublished: Boolean(published), publishedAt: published ? new Date() : null },
    select: { authorName: true },
  });
  updateTag(REVIEWS_TAG);
  await audit(g.admin, {
    section: "reviews",
    action: published ? "review.publish" : "review.unpublish",
    entityId: id,
    summary: `${published ? "Опубликовал" : "Снял с публикации"} отзыв: ${r.authorName}`,
  });
  return ok(published ? "Отзыв опубликован на главной" : "Отзыв снят с публикации");
}

export async function deleteReviewAction(id: string): Promise<ActionResult> {
  const g = await guardAction("reviews");
  if ("denied" in g) return g.denied;
  const r = await db.review.delete({ where: { id }, select: { authorName: true, rating: true } });
  updateTag(REVIEWS_TAG);
  await audit(g.admin, { section: "reviews", action: "review.delete", entityId: id, summary: `Удалил отзыв: ${r.authorName}, ${r.rating}★` });
  return ok("Отзыв удалён");
}

export async function setMessageHandledAction(id: string, handled: boolean): Promise<ActionResult> {
  const g = await guardAction("reviews");
  if ("denied" in g) return g.denied;
  const m = await db.contactMessage.update({ where: { id }, data: { handledAt: handled ? new Date() : null }, select: { name: true } });
  await audit(g.admin, {
    section: "reviews",
    action: handled ? "message.handled" : "message.reopen",
    entityId: id,
    summary: `${handled ? "Обработал" : "Вернул в работу"} сообщение с сайта от ${m.name}`,
  });
  return ok(handled ? "Отмечено как обработанное" : "Сообщение снова в работе");
}
