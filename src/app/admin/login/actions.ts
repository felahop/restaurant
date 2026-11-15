"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/server/admin/audit";
import { createAdminSession } from "@/server/admin/auth";
import { verifyPassword } from "@/server/admin/password";
import { db } from "@/server/db";
import { rateLimit } from "@/server/rate-limit";

const schema = z.object({ login: z.string().trim().min(1).max(64), password: z.string().min(1).max(200) });

export type LoginState = { error?: string };

/** Вход сотрудника. Ограничение: 5 попыток за 15 минут на IP и на логин. */
export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({ login: formData.get("login"), password: formData.get("password") });
  if (!parsed.success) return { error: "Введите логин и пароль" };
  const { login, password } = parsed.data;

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
  const [byIp, byLogin] = await Promise.all([
    rateLimit(`admin-login-ip:${ip}`, 10, 900),
    rateLimit(`admin-login:${login.toLowerCase()}`, 5, 900),
  ]);
  if (!byIp.ok || !byLogin.ok) return { error: "Слишком много попыток. Подождите 15 минут." };

  const user = await db.adminUser.findUnique({ where: { login } });
  // Проверяем пароль даже для несуществующего логина — время ответа не выдаёт, есть ли такой сотрудник.
  const valid = await verifyPassword(password, user?.passwordHash ?? "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAA");
  if (!user || !user.isActive || !valid) return { error: "Неверный логин или пароль" };

  await createAdminSession(user.id);
  await db.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit(user, { section: "auth", action: "auth.login", summary: "Вошёл в админ-панель" });
  redirect("/admin/orders");
}
