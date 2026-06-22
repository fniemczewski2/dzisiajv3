import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { code, next = '/' } = req.query;
  let targetPath = Array.isArray(next) ? next[0] : next;
  if (targetPath === '/index') targetPath = '/';

  if (code && typeof code === 'string') {
    const supabase = createServerSupabase(req, res);
    
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (!error) {
        const host = req.headers.host || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const cleanPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
        
        return res.redirect(`${protocol}://${host}${cleanPath}`);
      }
      
      console.error("[Auth Callback] Błąd wymiany kodu:", error.message);
    } catch (error) {
      console.error("[Auth Callback] Nieznany błąd podczas autoryzacji:", error);
    }
  }

  const host = req.headers.host || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return res.redirect(`${protocol}://${host}/start?error=auth_failed`);
}