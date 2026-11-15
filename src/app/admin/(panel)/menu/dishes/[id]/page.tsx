import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { DishForm } from "@/components/admin/menu/DishForm";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { requireAdmin } from "@/server/admin/auth";
import { dishFormData } from "@/server/admin/dish-form";

export const metadata: Metadata = { title: "Блюдо" };
/** Админка: переходы могут ждать данные (свежесть важнее мгновенного кадра). */
export const instant = false;

export default async function EditDishPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("menu");
  const { id } = await params;
  const { dish, initial, categories, groups } = await dishFormData(id);
  if (!dish) notFound();
  return (
    <div className="flex max-w-240 flex-col gap-2">
      <Link href="/admin/menu" className="inline-flex min-h-5.5 items-center gap-1 self-start text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-2" aria-hidden="true" />К меню
      </Link>
      <AdminPageHeader
        title={dish.name}
        actions={
          <a href={`/menu/${dish.slug}`} target="_blank" rel="noopener" className="inline-flex min-h-5.5 items-center gap-1 text-sm font-semibold text-fg hover:underline">
            Открыть на сайте <ExternalLink className="size-2" aria-hidden="true" />
          </a>
        }
      />
      <DishForm key={dish.updatedAt.toISOString()} id={dish.id} initial={initial} categories={categories} groups={groups} />
    </div>
  );
}
