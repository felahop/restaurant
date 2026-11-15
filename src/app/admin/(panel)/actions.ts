"use server";

import { redirect } from "next/navigation";
import { destroyAdminSession } from "@/server/admin/auth";

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/admin/login");
}
