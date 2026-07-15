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
  const isSafe = /^\/(?!\/)[\w\-/?=&#.%]*$/.test(targetPath);
  const cleanPath = isSafe ? targetPath : "/";

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
                try {
                  const bc = new BroadcastChannel('supabase-auth-channel');
                  bc.postMessage('auth-success');
                } catch(e) {}

                try {
                  localStorage.setItem('auth-success', Date.now().toString());
                } catch(e) {}

                if (window.opener && window.opener !== window) {
                  try {
                    window.opener.postMessage('auth-success', window.location.origin);
                  } catch(e) {}
                  window.close();
                } else {
                  setTimeout(() => {
                    window.location.replace('${cleanPath}');
                  }, 300);
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