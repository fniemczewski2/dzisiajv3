// supabase/functions/_shared/auth.ts
//
// Wspólne nagłówki HTTP, CORS i sprawdzanie sekretu crona dla Edge Functions.

/**
 * Porównanie sekretów w czasie niezależnym od miejsca pierwszej różnicy.
 * Bez zależności od deno.land/std (stara, nieprzypięta biblioteka).
 */
export function safeEqual(a: string, b: string): boolean {
  const encA = new TextEncoder().encode(a);
  const encB = new TextEncoder().encode(b);
  let diff = encA.length ^ encB.length;
  const length = Math.max(encA.length, encB.length);
  for (let i = 0; i < length; i++) diff |= (encA[i] ?? 0) ^ (encB[i] ?? 0);
  return diff === 0;
}

export function verifyCronSecret(req: Request, headerName = "x-cron-secret"): boolean {
  const expected = Deno.env.get("CRON_SECRET") ?? "";
  const provided = req.headers.get(headerName) ?? "";
  return expected.length > 0 && safeEqual(expected, provided);
}

/**
 * Funkcje wywoływane z przeglądarki przyjmują żądania tylko z dozwolonych
 * adresów aplikacji. Lista = adresy domyślne (z i bez `www`) + adresy z sekretu
 * ALLOWED_ORIGIN (po przecinku, np. lokalnie `http://localhost:3000`).
 * Nagłówek Access-Control-Allow-Origin może zawierać tylko jeden adres, dlatego
 * wartość jest dobierana do nagłówka Origin żądania w `withCors`.
 */
const DEFAULT_ORIGINS = ["https://dzisiaj.fun", "https://www.dzisiaj.fun"];

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export const ALLOWED_ORIGINS: string[] = [
  ...new Set(
    [...DEFAULT_ORIGINS, ...(Deno.env.get("ALLOWED_ORIGIN") ?? "").split(",")].map(normalizeOrigin).filter(Boolean)
  ),
];

// Wartość domyślna dla odpowiedzi bez dopasowanego Origin (np. wywołania z crona).
export const ALLOWED_ORIGIN = ALLOWED_ORIGINS[0];

export const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  Vary: "Origin",
};

export const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function unauthorized(): Response {
  return json({ error: "Brak autoryzacji." }, 401);
}

/**
 * Opakowuje handler funkcji wywoływanej z przeglądarki: ustawia
 * Access-Control-Allow-Origin na adres z żądania, o ile jest na liście
 * dozwolonych (także dla odpowiedzi 4xx/5xx i preflightu OPTIONS).
 */
export function withCors(handler: (req: Request) => Response | Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const origin = normalizeOrigin(req.headers.get("Origin") ?? "");
    const res = await handler(req);
    const headers = new Headers(res.headers);
    for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value);
    if (origin && ALLOWED_ORIGINS.includes(origin)) headers.set("Access-Control-Allow-Origin", origin);
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  };
}
