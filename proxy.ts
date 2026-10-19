// proxy.ts
//
// Strażnik stron: niezalogowanych przekierowuje na /start, zalogowanych
// z /start – na stronę docelową. Sesję weryfikuje lokalnie `getClaims()`
// (podpis JWT sprawdzany kluczem publicznym z JWKS projektu, bez zapytania do
// Supabase Auth przy każdym wejściu). Endpointy /api i pliki statyczne nie
// przechodzą przez proxy – API samo sprawdza sesję.

import { publicEnv } from "@/config/env";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeRedirectPath } from "@/lib/redirect";

const PUBLIC_PATHS = new Set(["/start", "/privacy", "/guide"]);
const PUBLIC_PREFIXES = ["/v/", "/meet/", "/.well-known/"];

function isPublic(path: string): boolean {
  return PUBLIC_PATHS.has(path) || PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function redirectWithCookies(target: URL, source: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(target);
  for (const cookie of source.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const connection = publicEnv.supabaseConnection;
  if (!connection) return response;

  const supabase = createServerClient(connection.url, connection.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  if (!signedIn && !isPublic(path)) {
    const target = request.nextUrl.clone();
    target.pathname = "/start";
    target.search = "";
    target.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return redirectWithCookies(target, response);
  }

  if (signedIn && path === "/start") {
    const target = new URL(safeRedirectPath(request.nextUrl.searchParams.get("next")), request.nextUrl.origin);
    return redirectWithCookies(target, response);
  }

  return response;
}

export const config = {
  matcher: [
    // Wszystko poza: API, zasobami Next.js, service workerem, manifestem,
    // plikami w /public (rozszerzenia) i plikami weryfikacyjnymi.
    "/((?!api/|_next/static|_next/image|sw\\.js|manifest\\.json|robots\\.txt|sitemap\\.xml|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|mp3|txt|html|json|js|css|woff2?)$).*)",
  ],
};
