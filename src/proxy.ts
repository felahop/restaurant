import { NextResponse, type NextRequest } from "next/server";

/**
 * Быстрая проверка для админки: без cookie сессии сразу отправляем на вход.
 * Это только удобство — права проверяются на сервере в каждом запросе (src/server/admin/auth.ts).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin/login")) return NextResponse.next();
  if (!request.cookies.has("admin_session")) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Войдите в админ-панель" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
