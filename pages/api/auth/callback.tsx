import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { code, next = '/' } = req.query;

  if (code && typeof code === 'string') {
    const supabase = createServerSupabase(req, res);
    
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (!error) {
        return res.redirect(next as string);
      }
      
      console.error("[Auth Callback] Błąd wymiany kodu:", error.message);
    } catch (error) {
      console.error("[Auth Callback] Nieznany błąd podczas autoryzacji:", error);
    }
  }
  return res.redirect('/login?error=auth_failed');
}