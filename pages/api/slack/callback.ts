// pages/api/slack/callback.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/server/tokenCrypto";
import { fetchWithTimeout } from "@/lib/server/fetchWithTimeout";
import { SLACK_API_BASE, SLACK_STATE_COOKIE, SLACK_REQUEST_TIMEOUT_MS } from "@/config/slack";

interface SlackOAuthResponse {
  ok: boolean;
  error?: string;
  team?: { id?: string; name?: string };
  authed_user?: { id?: string; access_token?: string; scope?: string };
}

function redirectWithError(res: NextApiResponse, reason: string) {
  return res.redirect(`/settings?slack_error=${reason}`);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const { code, state } = req.query;
  if (typeof code !== "string" || typeof state !== "string") {
    return redirectWithError(res, "missing_params");
  }

  const cookieNonce = req.cookies[SLACK_STATE_COOKIE];
  if (!cookieNonce || cookieNonce !== state) return redirectWithError(res, "invalid_state");

  const supabase = createServerSupabase(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirectWithError(res, "auth_failed");

  try {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
    const body = new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID ?? "",
      client_secret: process.env.SLACK_CLIENT_SECRET ?? "",
      code,
      redirect_uri: `${appUrl}/api/slack/callback`,
    });

    const response = await fetchWithTimeout(
      `${SLACK_API_BASE}/oauth.v2.access`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      },
      SLACK_REQUEST_TIMEOUT_MS
    );

    const payload = (await response.json()) as SlackOAuthResponse;
    const userToken = payload.authed_user?.access_token;

    if (!payload.ok || !userToken || !payload.team?.id || !payload.authed_user?.id) {
      console.error("[slack/callback] Wymiana kodu nieudana:", payload.error);
      return redirectWithError(res, "token_exchange_failed");
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    const { error } = await admin.from("slack_connections").upsert(
      {
        user_id: user.id,
        team_id: payload.team.id,
        team_name: payload.team.name ?? null,
        slack_user_id: payload.authed_user.id,
        access_token: encryptToken(userToken),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,team_id" }
    );

    if (error) {
      console.error("[slack/callback] Zapis połączenia nieudany:", error.message);
      return redirectWithError(res, "store_failed");
    }

    res.setHeader("Set-Cookie", `${SLACK_STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
    return res.redirect("/settings?slack=connected");
  } catch (err) {
    console.error("[slack/callback]:", err);
    return redirectWithError(res, "unexpected");
  }
}
