import { redirect } from "next/navigation";

/** Админка: переходы могут ждать данные (свежесть важнее мгновенного кадра). */
export const instant = false;

export default function AdminIndex() {
  redirect("/admin/orders");
}
