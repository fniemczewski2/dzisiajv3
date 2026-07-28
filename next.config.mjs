/** @type {import('next').NextConfig} */

function getSupabaseHostname() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname;
  } catch {
    return null;
  }
}

const supabaseHostname = getSupabaseHostname();
const isDev = process.env.NODE_ENV === "development";

// CSP EGZEKWOWANE (poprzednio tylko Report-Only, bez report-uri — czyli
// nic nie blokowało i raporty leciały donikąd). Kluczowe zmiany:
// - connect-src zawężony z `https:` (wildcard = trywialna eksfiltracja przy
//   XSS) do konkretnych domen, z którymi klient faktycznie rozmawia,
// - `unsafe-eval` tylko w dev (wymaga go react-refresh); w produkcji NIE,
// - `unsafe-inline` w script-src zostaje na razie ze względu na inline
//   skrypty Pages Routera i next-themes — docelowo do zastąpienia nonce'ami,
// - unpkg.com dopuszczony, bo PlacesMap ładuje stamtąd Leaflet
//   (rozważ przejście na import z node_modules i usunięcie tego wpisu),
// - frame-ancestors 'none' duplikuje X-Frame-Options: DENY (nowocześniejszy
//   mechanizm, starszy zostaje dla kompatybilności).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://unpkg.com`,
  "style-src 'self' 'unsafe-inline' https://unpkg.com",
  `img-src 'self' blob: data: https://image.tmdb.org https://*.tile.openstreetmap.org https://unpkg.com${supabaseHostname ? ` https://${supabaseHostname}` : ""}`,
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

const nextConfig = {
  reactStrictMode: true,
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
            value: 'camera=(), microphone=(), browsing-topics=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
