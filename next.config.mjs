// next.config.mjs

import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

function getSupabaseHostname() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname;
  } catch {
    return null;
  }
}

const supabaseHostname = getSupabaseHostname();

const supabaseOrigins = supabaseHostname ? [`https://${supabaseHostname}`, `wss://${supabaseHostname}`] : [];
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://image.tmdb.org ${supabaseOrigins[0] ?? ""}`.trim(),
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    ...supabaseOrigins,
    "https://api.open-meteo.com",
    "https://air-quality-api.open-meteo.com",
    "https://api.nbp.pl",
    ...(isDev ? ["ws:"] : []),
  ].join(" "),
  "media-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com https://login.microsoftonline.com https://slack.com",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

// CSP jest egzekwowane. CSP_REPORT_ONLY=1 przełącza na tryb raportowania
// (np. na czas diagnozy po dodaniu nowej usługi zewnętrznej).
// 'unsafe-inline' w script-src zostaje, bo strony są generowane statycznie
// (bez nonce na żądanie), a next-themes wstrzykuje skrypt motywu w treść strony;
// polityka nadal blokuje skrypty z obcych domen, eval, <object>, osadzanie
// strony w ramkach i wysyłanie formularzy poza listę.
const cspHeaderName =
  process.env.CSP_REPORT_ONLY === "1" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_COMMIT_SHA: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7),
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString(),
  },
  reactStrictMode: true,
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/api/transport/parse-ticket": [
      "./node_modules/pdf-parse/dist/**/*",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/legacy/build/pdf.mjs",
      "./node_modules/pdfjs-dist/standard_fonts/**/*",
      "./node_modules/pdfjs-dist/cmaps/**/*",
      "./node_modules/@napi-rs/canvas/**/*",
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      ...(supabaseHostname
        ? [
            {
              protocol: "https",
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
  headers() {
    return Promise.resolve([
      {
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), payment=(), usb=(), browsing-topics=(), geolocation=(self)",
          },
          {
            key: cspHeaderName,
            value: csp,
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          // HSTS tylko w produkcji – na http://localhost nie ma zastosowania.
          ...(isDev
            ? []
            : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
        ],
      },
    ]);
  },
};

export default nextConfig;
