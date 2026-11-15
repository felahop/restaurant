import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

/** Хэш пароля: scrypt (N = 2^15, r = 8, p = 1) с солью 16 байт. Формат: scrypt$N$r$p$соль$хэш. */

const N = 32_768;
const R = 8;
const P = 1;
const KEYLEN = 64;

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P, maxmem: 128 * N * R * 2 });
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, saltB64, keyB64] = stored.split("$");
  if (algo !== "scrypt" || !n || !r || !p || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64url");
  const nNum = Number(n);
  const rNum = Number(r);
  const key = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64url"), expected.length, {
    N: nNum,
    r: rNum,
    p: Number(p),
    maxmem: 128 * nNum * rNum * 2,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Требования к паролю сотрудника. */
export function passwordProblem(password: string): string | null {
  if (password.length < 10) return "Пароль должен быть не короче 10 символов";
  if (password.length > 200) return "Слишком длинный пароль";
  if (!/[A-Za-zА-Яа-яЁё]/.test(password) || !/\d/.test(password)) return "Нужны и буквы, и цифры";
  return null;
}
