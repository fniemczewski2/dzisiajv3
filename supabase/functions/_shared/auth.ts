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
 * Funkcje wywoływane z przeglądarki przyjmują żądania tylko z adresu aplikacji
 * (ALLOWED_ORIGIN, domyślnie https://dzisiaj.fun; lokalnie ustaw
 * http://localhost:3000). Funkcje crona nie potrzebują CORS, ale używają tych
 * samych nagłówków.
 */
export const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "https://dzisiaj.fun";

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
