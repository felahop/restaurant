import { isIP } from "node:net";

/** Проверка, входит ли IP в подсеть CIDR (IPv4 и IPv6). */

function ipv4ToBigInt(ip: string): bigint {
  return ip.split(".").reduce((acc, part) => (acc << 8n) + BigInt(Number(part)), 0n);
}

function ipv6ToBigInt(ip: string): bigint {
  const [head, tail = ""] = ip.split("::");
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  const missing = ip.includes("::") ? 8 - h.length - t.length : 0;
  const parts = [...h, ...Array<string>(missing).fill("0"), ...t];
  return parts.reduce((acc, part) => (acc << 16n) + BigInt(parseInt(part || "0", 16)), 0n);
}

export function ipInCidr(ip: string, cidr: string): boolean {
  const [range, bitsRaw] = cidr.split("/");
  const clean = ip.startsWith("::ffff:") && isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip;
  const v = isIP(clean);
  if (!range || v === 0 || v !== isIP(range)) return false;
  const width = v === 4 ? 32 : 128;
  const bits = bitsRaw === undefined ? width : Number(bitsRaw);
  const toInt = v === 4 ? ipv4ToBigInt : ipv6ToBigInt;
  const shift = BigInt(width - bits);
  return toInt(clean) >> shift === toInt(range) >> shift;
}

export function ipInAny(ip: string, cidrs: readonly string[]): boolean {
  return cidrs.some((c) => ipInCidr(ip, c));
}
