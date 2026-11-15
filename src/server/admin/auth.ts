import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/server/db";
import { canAccess, type AdminRoleName, type AdminSection } from "./roles";

export const ADMIN_COOKIE = "admin_session";
const SESSION_DAYS = 14; // планшет на кухне не должен разлогиниваться каждый день

export type CurrentAdmin = { id: string; login: string; name: string; role: AdminRoleName };

export class AdminAccessError extends Error {
  constructor(message = "Недостаточно прав") {
    super(message);
  }
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createAdminSession(adminUserId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.adminSession.create({ data: { tokenHash: hashToken(token), adminUserId, expiresAt } });
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !process.env.INSECURE_COOKIES,
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyAdminSession() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (token) await db.adminSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(ADMIN_COOKIE);
}

/** Текущий сотрудник или null. Один запрос к базе на запрос страницы. */
export const getAdmin = cache(async (): Promise<CurrentAdmin | null> => {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const session = await db.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { adminUser: true },
  });
  if (!session || session.expiresAt < new Date() || !session.adminUser.isActive) return null;
  const { id, login, name, role } = session.adminUser;
  return { id, login, name, role };
});

/** Для страниц: нет входа — на страницу входа, нет прав — на главную админки с сообщением. */
export async function requireAdmin(section?: AdminSection): Promise<CurrentAdmin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (section && !canAccess(admin.role, section)) redirect("/admin/orders?denied=1");
  return admin;
}

/** Для серверных действий и API: бросает ошибку вместо редиректа. */
export async function assertAdmin(section: AdminSection): Promise<CurrentAdmin> {
  const admin = await getAdmin();
  if (!admin) throw new AdminAccessError("Войдите заново");
  if (!canAccess(admin.role, section)) throw new AdminAccessError();
  return admin;
}
