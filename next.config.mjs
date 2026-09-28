/** @type {import('next').NextConfig} */

function getSupabaseHostname() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname;
  } catch {
    return null;
  }
}

const supabaseHostname = getSupabaseHostname();

// Content-Security-Policy. Wdrażamy najpierw w trybie Report-Only: przeglądarka
// tylko raportuje naruszenia w konsoli, nic nie blokuje. Po sprawdzeniu, że
// konsola jest czysta na wszystkich stronach, ustaw CSP_ENFORCE=1, żeby nagłówek
// został wysłany jako `Content-Security-Policy`.
// 'unsafe-inline' w script-src jest potrzebne dla Pages Routera (skrypt
// __NEXT_DATA__, JSON-LD w SEO) – docelowo warto przejść na nonce w _document.
const supabaseOrigins = supabaseHostname
  ? [`https://${supabaseHostname}`, `wss://${supabaseHostname}`]
  : [];
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
    "https://api.github.com",
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

const cspHeaderName =
  process.env.CSP_ENFORCE === "1" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";

const nextConfig = {
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
  async headers() {
    return [
      {
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY', 
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff', 
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin', 
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), payment=(), usb=(), browsing-topics=()',
          },
          {
            key: cspHeaderName,
            value: csp,
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            // same-origin-allow-popups: logowanie przez popup (window.opener) nadal działa.
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
