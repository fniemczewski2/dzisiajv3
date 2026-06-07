import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabase } from '../../../utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).redirect('/calendar?error=missing_params');

  try {
    const decodedState = JSON.parse(Buffer.from(state as string, 'base64url').toString());
    const userId = decodedState.userId;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code: code as string,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/google-calendar/callback`,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenResponse.json();

    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileResponse.json();
    const email = profile.email;

    const supabase = createServerSupabase(req, res);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await supabase.from('connected_calendars').upsert({
      user_id: userId,
      provider: 'google',
      account_email: email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || '', 
      expires_at: expiresAt,
    }, { onConflict: 'user_id, account_email' });

    res.redirect('/calendar?sync=success');
  } catch (error) {
    res.redirect('/calendar?error=auth_failed');
  }
}