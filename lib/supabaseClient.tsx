// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a single instance (singleton pattern)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Optional: helper if you want consistency with your app structure
export const getBrowserSupabaseClient = () => supabase;
