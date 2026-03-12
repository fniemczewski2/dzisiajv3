import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Używamy createBrowserClient, który pod spodem sprytnie zarządza sesją w przeglądarce
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export const getBrowserSupabaseClient = () => supabase;