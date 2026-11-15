import "server-only";

/** IP гостя за обратным прокси (Caddy/Nginx передают X-Forwarded-For). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Защита от подделки запросов с чужих сайтов: POST принимаем только с нашего источника.
 * Браузеры всегда присылают Origin для POST с fetch.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function jsonError(status: number, message: string, extra: Record<string, unknown> = {}) {
  return Response.json({ error: message, ...extra }, { status });
}
