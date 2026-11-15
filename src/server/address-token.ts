import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Подписанный адрес: сервер геокодирует адрес и отдаёт браузеру точку с подписью.
 * При расчёте и оформлении заказа подпись проверяется — подменить координаты нельзя.
 */

const TTL_MS = 6 * 60 * 60 * 1000;

export type SignedAddress = { value: string; lat: number; lng: number; exp: number };

function secret(): string {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 32) throw new Error("APP_SECRET не задан или короче 32 символов (см. .env.example)");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function issueAddressToken(address: Omit<SignedAddress, "exp">, now = Date.now()): string {
  const data: SignedAddress = { ...address, exp: now + TTL_MS };
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyAddressToken(token: string, now = Date.now()): SignedAddress | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SignedAddress;
    if (typeof data.lat !== "number" || typeof data.lng !== "number" || typeof data.value !== "string") return null;
    if (typeof data.exp !== "number" || data.exp < now) return null;
    return data;
  } catch {
    return null;
  }
}
