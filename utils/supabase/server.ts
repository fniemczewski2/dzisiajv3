import { createServerClient, serializeCookieHeader, type CookieOptions } from '@supabase/ssr' // Import typu CookieOptions
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from 'next'

interface CookieItem {
  name: string
  value: string
  options: CookieOptions
}

export function createServerSupabase(
  req: GetServerSidePropsContext['req'] | NextApiRequest,
  res: GetServerSidePropsContext['res'] | NextApiResponse
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return Object.keys(req.cookies).map((name) => ({ name, value: req.cookies[name] || '' }))
        },
        setAll(cookiesToSet: CookieItem[]) {
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
}