import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "@/server/db";

export const OTP_LENGTH = 4;
export const OTP_TTL_MS = 5 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;

function secret(): string {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 32) throw new Error("APP_SECRET не задан или короче 32 символов");
  return s;
}

/** Код хранится только как HMAC: по утечке базы его не восстановить перебором без секрета. */
export function hashOtp(phone: string, code: string): string {
  return createHmac("sha256", secret()).update(`${phone}:${code}`).digest("hex");
}

export function generateOtp(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

/** Новый код: прежние неиспользованные коды этого номера гасятся. */
export async function issueOtp(phone: string, now = new Date()): Promise<string> {
  const code = generateOtp();
  await db.$transaction([
    db.otpCode.updateMany({ where: { phone, consumedAt: null }, data: { consumedAt: now } }),
    db.otpCode.create({ data: { phone, codeHash: hashOtp(phone, code), expiresAt: new Date(now.getTime() + OTP_TTL_MS) } }),
  ]);
  return code;
}

export type OtpResult = "ok" | "invalid" | "expired" | "locked";

/** Проверка кода: не больше OTP_MAX_ATTEMPTS попыток, код одноразовый. */
export async function verifyOtp(phone: string, code: string, now = new Date()): Promise<OtpResult> {
  const otp = await db.otpCode.findFirst({ where: { phone, consumedAt: null }, orderBy: { createdAt: "desc" } });
  if (!otp || otp.expiresAt <= now) return "expired";
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return "locked";
  const expected = Buffer.from(otp.codeHash, "hex");
  const given = Buffer.from(hashOtp(phone, code), "hex");
  if (!timingSafeEqual(expected, given)) {
    const updated = await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return updated.attempts >= OTP_MAX_ATTEMPTS ? "locked" : "invalid";
  }
  // Атомарно: один и тот же код не сработает дважды даже при параллельных запросах.
  const consumed = await db.otpCode.updateMany({ where: { id: otp.id, consumedAt: null }, data: { consumedAt: now } });
  return consumed.count === 1 ? "ok" : "expired";
}
