// pages/api/auth/callback.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { code, next = '/' } = req.query;
  let targetPath = Array.isArray(next) ? next[0] : next;
  
  if (targetPath === '/index') targetPath = '/';
  const cleanPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;

  if (code && typeof code === 'string') {
    const supabase = createServerSupabase(req, res);
    
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (!error) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Logowanie...</title>
              <script>
                if (window.opener && window.opener !== window) {
                  // Jeśli otwarte jako subokno w PWA, wysyłamy sygnał i zamykamy okno
                  window.opener.postMessage('auth-success', window.location.origin);
                  window.close();
                } else {
                  // W zwykłej karcie po prostu przekierowujemy
                  window.location.replace('${cleanPath}');
                }
              </script>
            </head>
            <body style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; background: #000; color: #fff;">
              <p>Pomyślnie zalogowano. Trwa przekierowanie (możesz bezpiecznie zamknąć to okno)...</p>
            </body>
          </html>
        `);
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