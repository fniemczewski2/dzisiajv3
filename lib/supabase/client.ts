// lib/supabase/client.ts

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/config/env";

let browserClient: SupabaseClient | null = null;

/**
 * Jeden klient przeglądarkowy na kartę. Kolejne wywołania zwracają ten sam
 * obiekt – kilka instancji GoTrue rywalizowałoby o odświeżanie sesji.
 * W komponentach używaj `useAuth().supabase`.
 */
export function createClient(): SupabaseClient {
  browserClient ??= createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey);
  return browserClient;
}
