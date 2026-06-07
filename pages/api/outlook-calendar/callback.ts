import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabase } from '../../../utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).redirect('/settings?error=missing_params');

  try {
    const decodedState = JSON.parse(Buffer.from(state as string, 'base64').toString());
    const userId = decodedState.userId;

    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.OUTLOOK_CLIENT_ID!,
        client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
        code: code as string,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/outlook-calendar/callback`,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenResponse.json();

    const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileResponse.json();
    const email = profile.mail || profile.userPrincipalName;

    const supabase = createServerSupabase(req, res);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await supabase.from('connected_calendars').upsert({
      user_id: userId,
      provider: 'outlook',
      account_email: email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
    }, { onConflict: 'user_id, account_email' });

    res.redirect('/settings?sync=success');
  } catch (error) {
    res.redirect('/settings?error=auth_failed');
  }
}