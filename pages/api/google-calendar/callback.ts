// pages/api/google-calendar/callback.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

function getRedirectUri(req: NextApiRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    return `${baseUrl}/api/google-calendar/callback`;
  }
  const host = req.headers.host || "localhost:3000";
  const proto = host.includes("localhost") ? "http" : "https";
  return `${proto}://${host}/api/google-calendar/callback`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, error, state } = req.query;

  if (error) {
    console.error("[Google OAuth callback] error from Google:", error);
    return res.redirect(`/calendar?google_error=${encodeURIComponent(String(error))}`);
  }

  if (!code || !state) {
    return res.redirect("/calendar?google_error=missing_params");
  }

  let userId: string;
  let supabaseToken: string;
  try {
    const decoded = JSON.parse(Buffer.from(String(state), "base64url").toString("utf-8"));
    userId = decoded.userId;
    supabaseToken = decoded.token;
    if (!userId || !supabaseToken) throw new Error("incomplete state");
  } catch {
    return res.redirect("/calendar?google_error=invalid_state");
  }

  const supabaseVerify = (() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      throw new Error("Brak zmiennych środowiskowych Supabase!");
    }

    return createClient(url, key, {
      global: {
        headers: {
          Authorization: `Bearer ${supabaseToken}`,
        },
      },
    });
  })();

  const { data: { user }, error: authErr } = await supabaseVerify.auth.getUser(supabaseToken);
  if (authErr || user?.id !== userId) {
    console.error("[Google OAuth callback] Supabase token invalid:", authErr?.message);
    return res.redirect("/calendar?google_error=session_expired");
  }

  const redirectUri = getRedirectUri(req);
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: String(code),
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error("[Google OAuth callback] token exchange failed:", tokenRes.status, body);
    return res.redirect("/calendar?google_error=token_exchange_failed");
  }

  const tokens = await tokenRes.json();

  if (!tokens.access_token) {
    return res.redirect("/calendar?google_error=no_access_token");
  }

  const supabaseAdmin = (() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY; // Uwaga: klucz SECRET powinien być tylko po stronie serwera!

    if (!url || !key) {
      throw new Error("Brak kluczy administracyjnych Supabase (URL lub SECRET_KEY)!");
    }

    return createClient(url, key);
  })();

  const { error: upsertErr } = await supabaseAdmin.rpc("upsert_google_token", {
    p_user_id:      userId,
    p_access_token:  tokens.access_token,
    p_refresh_token: tokens.refresh_token ?? null,   
    p_expires_at:    new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
    p_scope:         tokens.scope ?? null,
  });

  if (upsertErr) {
    console.error("[Google OAuth callback] DB upsert error:", upsertErr);
    return res.redirect("/calendar?google_error=db_error");
  }

  return res.redirect("/calendar?google_connected=1");
}