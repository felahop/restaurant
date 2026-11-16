import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/server/db";

export const USER_COOKIE = "session";
/** Не секрет: подсказка браузеру, что гость вошёл (синхронизировать корзину). */
export const SIGNED_IN_COOKIE = "signed_in";
const SESSION_DAYS = 90;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createUserSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({ data: { tokenHash: sha256(token), userId, expiresAt } });
  const jar = await cookies();
  const base = { sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt };
  jar.set(USER_COOKIE, token, { ...base, httpOnly: true });
  jar.set(SIGNED_IN_COOKIE, "1", { ...base, httpOnly: false });
}

export async function destroyUserSession() {
  const jar = await cookies();
  const token = jar.get(USER_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(USER_COOKIE);
  jar.delete(SIGNED_IN_COOKIE);
}

export type CurrentUser = { id: string; phone: string; name: string | null; email: string | null; bonusBalance: number };

/** Гость, вошедший по коду, или null. Один запрос к базе на рендер (React cache). */
export const getUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(USER_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    select: { expiresAt: true, user: { select: { id: true, phone: true, name: true, email: true, bonusBalance: true } } },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  return session.user;
});
