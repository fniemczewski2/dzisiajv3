import { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/server/tokenCrypto";

export interface OAuthProviderConfig {
  provider: "google" | "outlook";
  stateCookieName: string;
  tokenUrl: string;
  profileUrl: string;
  calendarName: string;
  buildClientCredentials: () => { client_id: string; client_secret: string };
  extractEmail: (profile: Record<string, unknown>) => string | undefined;
}

export async function handleOAuthCallback(
  req: NextApiRequest,
  res: NextApiResponse,
  config: OAuthProviderConfig
) {
  const { code, state } = req.query;

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!code || !state) return res.redirect(307, "/calendar?error=missing_params");

  const cookieNonce = req.cookies[config.stateCookieName];
  if (!cookieNonce || cookieNonce !== state) return res.redirect("/calendar?error=invalid_state");

  const supabase = createServerSupabase(req, res);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return res.redirect("/calendar?error=auth_failed");

  try {
    const { client_id, client_secret } = config.buildClientCredentials();
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id,
        client_secret,
        code: code as string,
        redirect_uri: `${appUrl}/api/${config.provider}-calendar/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok || !tokens.access_token) {
      console.error(`[${config.provider}] Token exchange failed:`, tokens.error_description ?? tokens.error ?? tokenResponse.status);
      return res.redirect("/calendar?error=token_exchange_failed");
    }

    const profileResponse = await fetch(config.profileUrl, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileResponse.ok) {
      console.error(`[${config.provider}] Profile fetch failed:`, profileResponse.status);
      return res.redirect("/calendar?error=profile_fetch_failed");
    }

    const profile = await profileResponse.json();
    const email = config.extractEmail(profile);
    if (!email) {
      console.error(`[${config.provider}] Profile response without email.`);
      return res.redirect("/calendar?error=profile_fetch_failed");
    }

    const expiresInSec = typeof tokens.expires_in === "number" ? tokens.expires_in : 3600;
    const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

    const row: Record<string, unknown> = {
      user_id: user.id,
      provider: config.provider,
      account_email: email,
      access_token: encryptToken(tokens.access_token),
      expires_at: expiresAt,
      google_calendar_id: "@account_connection",
      calendar_name: config.calendarName,
    };
    if (tokens.refresh_token) {
      row.refresh_token = encryptToken(tokens.refresh_token);
    }

    const { error } = await supabase.from("connected_calendars").upsert(row, {
      onConflict: "user_id, account_email, google_calendar_id",
    });
    if (error) console.error(`[${config.provider}] DB upsert error:`, error);

    return res.redirect("/calendar?sync=success");
  } catch (error) {
    console.error(`[${config.provider}] Callback error:`, error);
    return res.redirect("/calendar?error=auth_failed");
  }
}
