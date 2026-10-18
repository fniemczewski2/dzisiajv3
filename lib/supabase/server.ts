// lib/supabase/server.ts

import { createServerClient, serializeCookieHeader, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import { publicEnv } from "@/config/env";

interface CookieItem {
  name: string;
  value: string;
  options: CookieOptions;
}

/** Klient z sesją użytkownika z ciasteczek (API routes, getServerSideProps). Obowiązuje RLS. */
export function createServerSupabase(
  req: GetServerSidePropsContext["req"] | NextApiRequest,
  res: GetServerSidePropsContext["res"] | NextApiResponse
) {
  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    cookies: {
      getAll() {
        return Object.keys(req.cookies).map((name) => ({ name, value: req.cookies[name] || "" }));
      },
      setAll(cookiesToSet: CookieItem[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.appendHeader("Set-Cookie", serializeCookieHeader(name, value, options));
          });
        } catch (error) {
          console.warn("[supabase/server] Nie udało się ustawić cookies sesji:", error);
        }
      },
    },
  });
}

let anonClient: SupabaseClient | null = null;

/**
 * Klient bez sesji (rola anon) – wyłącznie do danych publicznych, np.
 * udostępnionych wizytówek. Obowiązuje RLS.
 */
export function createAnonSupabase(): SupabaseClient {
  anonClient ??= createClient(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return anonClient;
}
