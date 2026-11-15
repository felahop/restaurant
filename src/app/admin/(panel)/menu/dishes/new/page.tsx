import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DishForm } from "@/components/admin/menu/DishForm";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { requireAdmin } from "@/server/admin/auth";
import { dishFormData } from "@/server/admin/dish-form";

export const metadata: Metadata = { title: "Новое блюдо" };
/** Админка: переходы могут ждать данные (свежесть важнее мгновенного кадра). */
export const instant = false;

export default async function NewDishPage() {
  await requireAdmin("menu");
  const { initial, categories, groups } = await dishFormData(null);
  return (
    <div className="flex max-w-240 flex-col gap-2">
      <Link href="/admin/menu" className="inline-flex min-h-5.5 items-center gap-1 self-start text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-2" aria-hidden="true" />К меню
      </Link>
      <AdminPageHeader title="Новое блюдо" />
      <DishForm id={null} initial={initial} categories={categories} groups={groups} />
    </div>
  );
}
