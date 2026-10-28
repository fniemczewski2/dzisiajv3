// lib/server/mailOAuth.ts
//
// Wspólny przepływ OAuth kont poczty (Gmail, Outlook) – odpowiednik handleOAuthCallback z kalendarzy:
// start (nonce w ciasteczku) i powrót (stan, wymiana kodu, adres konta, zapis z zaszyfrowanymi tokenami).

import type { NextApiRequest, NextApiResponse } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { publicEnv } from "@/config/env";
import { CACHE_CONTROL } from "@/config/server";
import { allowMethods, requireUser } from "@/lib/server/apiGuards";
import { createServerSupabase } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/server/tokenCrypto";
import { safeEqual } from "@/lib/server/safeEqual";
import { clearStateCookie } from "@/lib/server/oauthState";
import { fetchWithTimeout } from "@/lib/server/fetchWithTimeout";
import { normalizeEmail, parseTokenResponse, planAccountSave, type TokenSet } from "@/lib/mail/accountRules";

const MAIL_RETURN_PATH = "/mail";

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
}

export interface MailOAuthConfig {
  provider: "gmail" | "outlook";
  stateCookieName: string;
  redirectPath: string;
  tokenUrl: string;
  profileUrl: string;
  scope: string;
  credentials(): OAuthCredentials | null;
  buildAuthUrl(params: { clientId: string; redirectUri: string; state: string }): string;
  extractEmail(profile: unknown): string | null;
}

function redirectUri(config: MailOAuthConfig): string {
  return `${publicEnv.appUrl}${config.redirectPath}`;
}

/** GET /api/mail/<dostawca>: adres autoryzacji + jednorazowy nonce w ciasteczku. */
export async function startMailOAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  config: MailOAuthConfig
): Promise<void> {
  if (!allowMethods(req, res, ["GET"])) return;
  const auth = await requireUser(req, res);
  if (!auth) return;

  const credentials = config.credentials();
  if (!credentials) {
    res.status(503).json({ error: "Połączenie z tym dostawcą poczty nie jest skonfigurowane." });
    return;
  }

  const nonce = randomBytes(24).toString("base64url");
  res.setHeader(
    "Set-Cookie",
    `${config.stateCookieName}=${nonce}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`
  );
  res.setHeader("Cache-Control", CACHE_CONTROL.private);
  res.status(200).json({
    url: config.buildAuthUrl({ clientId: credentials.clientId, redirectUri: redirectUri(config), state: nonce }),
  });
}

type MailSaveResult = "saved" | "limit" | "no_refresh" | "save_failed";

/** Zapis lub aktualizacja konta (tokeny szyfrowane). Przy ponownym połączeniu bez refresh tokenu zachowuje stary. */
async function saveMailAccount(
  supabase: SupabaseClient,
  input: { userId: string; provider: "gmail" | "outlook"; email: string; tokens: TokenSet; scope: string }
): Promise<MailSaveResult> {
  const { count } = await supabase.from("mail_accounts").select("id", { count: "exact", head: true });
  const { data: existing } = await supabase
    .from("mail_accounts")
    .select("id")
    .eq("provider", input.provider)
    .eq("email", input.email)
    .maybeSingle();

  const plan = planAccountSave({
    count: count ?? 0,
    exists: Boolean(existing),
    hasRefreshToken: Boolean(input.tokens.refreshToken),
  });
  if (plan.action === "reject") return plan.reason;

  const accessFields = {
    access_token: encryptToken(input.tokens.accessToken),
    expires_at: input.tokens.expiresAt,
    scope: input.scope,
    updated_at: new Date().toISOString(),
  };
  const refreshField = input.tokens.refreshToken ? encryptToken(input.tokens.refreshToken) : null;

  const { error } =
    plan.action === "update" && existing
      ? await supabase
          .from("mail_accounts")
          .update({ ...accessFields, ...(refreshField ? { refresh_token: refreshField } : {}) })
          .eq("id", existing.id)
      : await supabase.from("mail_accounts").insert({
          user_id: input.userId,
          provider: input.provider,
          email: input.email,
          refresh_token: refreshField,
          ...accessFields,
        });
  if (error) {
    console.error("[mailOAuth] zapis konta:", error.message);
    return "save_failed";
  }
  return "saved";
}

/** GET /api/mail/<dostawca>/callback: wynik zawsze jako przekierowanie na /mail?connected=… albo ?error=… */
export async function handleMailOAuthCallback(
  req: NextApiRequest,
  res: NextApiResponse,
  config: MailOAuthConfig
): Promise<void> {
  if (!allowMethods(req, res, ["GET"])) return;
  const back = (query: string): void => {
    res.redirect(303, `${MAIL_RETURN_PATH}?${query}`);
  };

  const cookieNonce = req.cookies[config.stateCookieName];
  clearStateCookie(res, config.stateCookieName);

  const { code, state, error } = req.query;
  if (typeof error === "string") {
    back("error=denied");
    return;
  }
  if (typeof code !== "string" || typeof state !== "string" || !cookieNonce || !safeEqual(cookieNonce, state)) {
    {
      back("error=invalid_state");
      return;
    }
  }

  const supabase = createServerSupabase(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    back("error=auth_failed");
    return;
  }

  const credentials = config.credentials();
  if (!credentials) {
    back("error=token_failed");
    return;
  }

  let tokens: TokenSet | null;
  try {
    const tokenRes = await fetchWithTimeout(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        code,
        redirect_uri: redirectUri(config),
        grant_type: "authorization_code",
      }),
    });
    const body: unknown = await tokenRes.json().catch(() => null);
    tokens = tokenRes.ok ? parseTokenResponse(body) : null;
    if (!tokens) {
      // Kod i opis błędu dostawcy (np. AADSTS…, invalid_grant) – bez tokenów i sekretów.
      const { error: code_, error_description: description } = (body ?? {}) as Record<string, unknown>;
      console.error(`[mailOAuth] ${config.provider}: wymiana kodu odrzucona`, {
        status: tokenRes.status,
        redirectUri: redirectUri(config),
        error: code_,
        description: typeof description === "string" ? description.slice(0, 500) : undefined,
      });
      {
        back("error=token_failed");
        return;
      }
    }
  } catch (err) {
    console.error(`[mailOAuth] ${config.provider}: brak odpowiedzi przy wymianie kodu`, err);
    {
      back("error=token_failed");
      return;
    }
  }

  let email: string | null;
  try {
    const profileRes = await fetchWithTimeout(config.profileUrl, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    const profile: unknown = profileRes.ok ? await profileRes.json().catch(() => null) : null;
    if (!profileRes.ok) console.error(`[mailOAuth] ${config.provider}: profil konta`, profileRes.status);
    email = normalizeEmail(config.extractEmail(profile) ?? "");
  } catch (err) {
    console.error(`[mailOAuth] ${config.provider}: profil konta`, err);
    email = null;
  }
  if (!email) {
    back("error=profile_failed");
    return;
  }

  try {
    const result = await saveMailAccount(supabase, {
      userId: user.id,
      provider: config.provider,
      email,
      tokens,
      scope: config.scope,
    });
    back(result === "saved" ? `connected=${config.provider}` : `error=${result}`);
  } catch (err) {
    // Np. brak klucza szyfrowania tokenów – to nie jest odmowa dostawcy.
    console.error(`[mailOAuth] ${config.provider}: zapis konta`, err);
    {
      back("error=save_failed");
      return;
    }
  }
}
