"use server";

import { redirect } from "next/navigation";
import { audit } from "@/server/admin/audit";
import { destroyAdminSession, getAdmin } from "@/server/admin/auth";

export async function logoutAction() {
  const admin = await getAdmin();
  if (admin) await audit(admin, { section: "auth", action: "auth.logout", summary: "Вышел из админ-панели" });
  await destroyAdminSession();
  redirect("/admin/login");
}
