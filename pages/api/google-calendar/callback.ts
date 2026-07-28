import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabase } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/server/tokenCrypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state } = req.query;

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!code || !state) return res.status(400).redirect('/calendar?error=missing_params');

  const cookieNonce = req.cookies["gcal_oauth_state"];
  if (!cookieNonce || cookieNonce !== state) return res.redirect('/calendar?error=invalid_state');

  const supabase = createServerSupabase(req, res);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) return res.redirect('/calendar?error=auth_failed');

  try {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, "");

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code: code as string,
        redirect_uri: `${appUrl}/api/google-calendar/callback`, 
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    // Wcześniej brak tej walidacji powodował: fetch userinfo z "Bearer undefined",
    // email = undefined i wyjątek na new Date(NaN) łapany zbiorczym catch.
    if (!tokenResponse.ok || !tokens.access_token) {
      console.error("[gcal] Token exchange failed:", tokens.error_description ?? tokens.error ?? tokenResponse.status);
      return res.redirect('/calendar?error=token_exchange_failed');
    }

    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileResponse.ok) {
      console.error("[gcal] Userinfo fetch failed:", profileResponse.status);
      return res.redirect('/calendar?error=profile_fetch_failed');
    }
    const profile = await profileResponse.json();
    const email = profile.email;
    if (!email) {
      console.error("[gcal] Userinfo response without email.");
      return res.redirect('/calendar?error=profile_fetch_failed');
    }

    const expiresInSec = typeof tokens.expires_in === 'number' ? tokens.expires_in : 3600;
    const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

    const row: Record<string, unknown> = {
      user_id: user.id, 
      provider: 'google',
      account_email: email,
      access_token: encryptToken(tokens.access_token),
      expires_at: expiresAt,
      google_calendar_id: '@account_connection',  
      calendar_name: 'Połączenie Google'         
    };
    // Google zwraca refresh_token tylko przy pierwszym consencie (lub prompt=consent).
    // Gdy go brakuje, NIE nadpisujemy istniejącego zaszyfrowanym pustym stringiem —
    // pominięcie pola w upsert zachowuje dotychczasową wartość kolumny.
    if (tokens.refresh_token) {
      row.refresh_token = encryptToken(tokens.refresh_token);
    }

    const { error } = await supabase.from('connected_calendars').upsert(row, {
      onConflict: 'user_id, account_email, google_calendar_id',
    });

    if (error) console.error("[gcal] DB upsert error:", error);

    res.redirect('/calendar?sync=success');
  } catch (error) {
    console.error("[gcal] Callback error:", error);
    res.redirect('/calendar?error=auth_failed');
  }
}
