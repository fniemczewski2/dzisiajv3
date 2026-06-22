import { NextApiRequest, NextApiResponse } from 'next'
import { CookieOptions, createServerClient, serializeCookieHeader } from '@supabase/ssr';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { code, next = '/' } = req.query

  if (code) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

    const supabase = createServerClient(url, key,
      {
        cookies: {
          getAll() {
            return Object.keys(req.cookies).map((name) => ({
              name,
              value: req.cookies[name] || '',
            }))
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                res.appendHeader('Set-Cookie', serializeCookieHeader(name, value, options))
              })
            } catch {
              { return res.status(500).json({ error: "Wystąpił błąd logowania" });}
            }
          },
        },
      }
    )
    
    const { error } = await supabase.auth.exchangeCodeForSession(String(code))
    if (error) {
      { return res.status(500).json({ error: "Wystąpił błąd logowania" });}
    }
  }

  const host = req.headers.host || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  
  const nextPath = Array.isArray(next) ? next[0] : next
  const redirectUrl = `${protocol}://${host}${nextPath}`
  
  res.redirect(redirectUrl)
}