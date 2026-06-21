import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state } = req.query;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!code || !state) return res.status(400).redirect('/calendar?error=missing_params');

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

    const { data: existingAccount, error: searchError } = await supabase
      .from('connected_calendars')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'outlook')
      .eq('account_email', email)
      .eq('google_calendar_id', '@account_connection')
      .maybeSingle();

    if (searchError) throw searchError;

    const payload = {
      user_id: userId,
      provider: 'outlook',
      account_email: email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      google_calendar_id: '@account_connection',
      calendar_name: 'Główne konto Outlook'
    };

    if (existingAccount) {
      const { error: updateError } = await supabase
        .from('connected_calendars')
        .update(payload)
        .eq('id', existingAccount.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('connected_calendars')
        .insert(payload);

      if (insertError) throw insertError;
    }

    res.redirect('/calendar?sync=success');
  } catch {
    res.redirect('/calendar?error=auth_failed');
  }
}