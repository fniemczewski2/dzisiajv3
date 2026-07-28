import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabase } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/server/tokenCrypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state } = req.query;

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!code || !state) return res.status(400).redirect('/calendar?error=missing_params');

  const cookieNonce = req.cookies["outlook_oauth_state"];
  if (!cookieNonce || cookieNonce !== state) return res.redirect('/calendar?error=invalid_state');

  const supabase = createServerSupabase(req, res);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return res.redirect('/calendar?error=auth_failed');

  try {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, "");

    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.OUTLOOK_CLIENT_ID!,
        client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
        code: code as string,
        redirect_uri: `${appUrl}/api/outlook-calendar/callback`,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok || !tokens.access_token) {
      console.error("[outlook] Token exchange failed:", tokens.error_description ?? tokens.error ?? tokenResponse.status);
      return res.redirect('/calendar?error=token_exchange_failed');
    }

    const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileResponse.ok) {
      console.error("[outlook] Profile fetch failed:", profileResponse.status);
      return res.redirect('/calendar?error=profile_fetch_failed');
    }
    const profile = await profileResponse.json();
    const email = profile.mail || profile.userPrincipalName;
    if (!email) {
      console.error("[outlook] Profile response without email.");
      return res.redirect('/calendar?error=profile_fetch_failed');
    }

    const expiresInSec = typeof tokens.expires_in === 'number' ? tokens.expires_in : 3600;
    const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

    const row: Record<string, unknown> = {
      user_id: user.id, 
      provider: 'outlook',
      account_email: email,
      access_token: encryptToken(tokens.access_token),
      expires_at: expiresAt,
      google_calendar_id: '@account_connection',  
      calendar_name: 'Połączenie Outlook'         
    };
    // Nie nadpisuj istniejącego refresh_tokena pustą wartością.
    if (tokens.refresh_token) {
      row.refresh_token = encryptToken(tokens.refresh_token);
    }

    const { error } = await supabase.from('connected_calendars').upsert(row, {
      onConflict: 'user_id, account_email, google_calendar_id',
    });

    if (error) console.error("[outlook] DB upsert error:", error);

    res.redirect('/calendar?sync=success');
  } catch (error) {
    console.error("[outlook] Callback error:", error);
    res.redirect('/calendar?error=auth_failed');
  }
}
