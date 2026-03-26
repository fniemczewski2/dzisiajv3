import { createServerClient, serializeCookieHeader } from '@supabase/ssr'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, next = '/' } = req.query

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return Object.keys(req.cookies).map((name) => ({
              name,
              value: req.cookies[name] || '',
            }))
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                res.appendHeader('Set-Cookie', serializeCookieHeader(name, value, options))
              })
            } catch (error) {
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

  // Dynamiczne wykrywanie hosta (Localhost vs Produkcja)
  const host = req.headers.host || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  
  // Bezpieczne przypisanie ścieżki (Next.js query może czasem zwrócić tablicę)
  const nextPath = Array.isArray(next) ? next[0] : next
  const redirectUrl = `${protocol}://${host}${nextPath}`
  
  res.redirect(redirectUrl)
}