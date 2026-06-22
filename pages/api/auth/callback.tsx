import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { code, next = '/' } = req.query;
  const targetUrl = typeof next === 'string' ? next : '/';

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
              <meta http-equiv="refresh" content="0;url=${targetUrl}" />
              <title>Logowanie...</title>
            </head>
            <body>
              <script>
                // Wymuszenie nawigacji wewnątrz instancji PWA
                window.location.replace("${targetUrl}");
              </script>
            </body>
          </html>
        `);
      }
      
      console.error("[Auth Callback] Błąd wymiany kodu:", error.message);
    } catch (error) {
      console.error("[Auth Callback] Nieznany błąd podczas autoryzacji:", error);
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="refresh" content="0;url=/login?error=auth_failed" />
      </head>
      <body>
        <script>
          window.location.replace("/login?error=auth_failed");
        </script>
      </body>
    </html>
  `);
}