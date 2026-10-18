// supabase/functions/_shared/supabase.ts
//
// Jedyny import klienta Supabase w Edge Functions – jedna, przypięta wersja
// (ta sama co w aplikacji Next.js). Aktualizacja: zmień numer tutaj.

export { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";
