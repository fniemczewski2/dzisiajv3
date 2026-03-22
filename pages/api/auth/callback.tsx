// pages/api/auth/callback.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabase } from '../../../utils/supabase/server'; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const code = req.query.code;
  const next = typeof req.query.next === 'string' ? req.query.next : '/';

  if (typeof code === 'string') {
    const supabase = createServerSupabase(req, res);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return res.redirect(302, next);
    }
  }

  return res.redirect(302, '/login?error=auth_failed');
}