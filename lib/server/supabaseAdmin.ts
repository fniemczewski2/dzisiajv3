// lib/server/supabaseAdmin.ts
//
// Klient Supabase z kluczem service_role – omija RLS, więc wolno go używać
// wyłącznie po stronie serwera i tylko po własnym sprawdzeniu, czy zasób
// należy do wywołującego (zob. docs/ARCHITECTURE.md, „Granica bezpieczeństwa”).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/config/env";

let cached: SupabaseClient | null = null;

/**
 * Zwraca współdzielony klient service_role. Brak NEXT_PUBLIC_SUPABASE_URL lub
 * SUPABASE_SECRET_KEY rzuca `MissingEnvError` w chwili użycia, a nie przy
 * imporcie modułu – endpoint może więc odpowiedzieć czytelnym błędem 500.
 */
export function supabaseAdmin(): SupabaseClient {
  cached ??= createClient(publicEnv.supabaseUrl, serverEnv.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cached;
}

/** Tylko do testów. */
export function __resetSupabaseAdmin() {
  cached = null;
}
