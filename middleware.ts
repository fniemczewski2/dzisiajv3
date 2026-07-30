import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getSupabaseHostname(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname;
  } catch {
    return null;
  }
}

const supabaseHostname = getSupabaseHostname();
const isDev = process.env.NODE_ENV === "development";

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: https://image.tmdb.org https://*.tile.openstreetmap.org${supabaseHostname ? ` https://${supabaseHostname}` : ""}`,
    "font-src 'self' data:",
    [
      "connect-src 'self'",
      supabaseHostname ? `https://${supabaseHostname} wss://${supabaseHostname}` : "",
      "https://api.open-meteo.com",
      "https://air-quality-api.open-meteo.com",
      "https://api.nbp.pl",
    ].filter(Boolean).join(" "),
    "worker-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com https://login.microsoftonline.com",
  ].join("; ");
}

export function middleware(req: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("x-nonce", nonce);
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
