import { createServerClient, serializeCookieHeader, type CookieOptions } from '@supabase/ssr'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, next = '/' } = req.query

  if (code) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      throw new Error("Brak zmiennych środowiskowych Supabase!");
    }
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
            } catch (error) {
              throw new Error("Błąd autoryzacji.")
            }
          },
        },
      }
    )
    
    const { error } = await supabase.auth.exchangeCodeForSession(String(code))
    if (error) {
      console.error('Błąd logowania w callbacku:', error.message)
    }
  }

  const host = req.headers.host || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  
  const nextPath = Array.isArray(next) ? next[0] : next
  const redirectUrl = `${protocol}://${host}${nextPath}`
  
  res.redirect(redirectUrl)
}