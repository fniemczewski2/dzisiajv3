import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, next = '/' } = req.query

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies[name]
          },
          set(name: string, value: string, options: CookieOptions) {
            res.setHeader('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`)
          },
          remove(name: string, options: CookieOptions) {
            res.setHeader('Set-Cookie', `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
          },
        },
      }
    )
    
    await supabase.auth.exchangeCodeForSession(String(code))
  }

  const host = req.headers.host || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  
  const redirectUrl = `${protocol}://${host}${next}`
  
  res.redirect(redirectUrl)
}