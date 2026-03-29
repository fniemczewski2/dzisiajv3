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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }

  return createServerClient(url, key,
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
          } catch {
            throw new Error("Wystąpił błąd autoryzacji")
          }
        },
      },
    }
  )
}