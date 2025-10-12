import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

let browserSupabase: ReturnType<typeof createPagesBrowserClient> | undefined;

export function getBrowserSupabaseClient() {
  if (!browserSupabase) {
    browserSupabase = createPagesBrowserClient();
  }
  return browserSupabase;
}
