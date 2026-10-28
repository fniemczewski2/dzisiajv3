// lib/server/mailRoute.ts
//
// Wspólne przygotowanie tras /api/mail/*: sesja (requireUser), identyfikator konta, ważny token
// (z odświeżeniem) i klient dostawcy (Gmail lub Outlook) za wspólnym interfejsem MailProviderClient.

import type { NextApiRequest, NextApiResponse } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/server/apiGuards";
import { decryptToken, encryptToken } from "@/lib/server/tokenCrypto";
import { refreshGoogleToken, refreshOutlookToken } from "@/lib/server/oauthTokens";
import { createGmailClient, type FetchLike } from "@/lib/mail/gmail";
import { createOutlookClient } from "@/lib/mail/outlook";
import { gmailProvider, outlookProvider, type MailProviderClient } from "@/lib/mail/provider";
import { resolveGmailAccessToken, type StoredGmailAccount } from "@/lib/mail/gmailAccess";
import { canDeleteInMailbox } from "@/lib/mail/accountRules";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export interface MailRouteContext {
  supabase: SupabaseClient;
  userId: string;
  accountEmail: string;
  provider: "gmail" | "outlook";
  accountId: string;
  canDeleteInMailbox: boolean;
  client: MailProviderClient;
}

type StoredMailAccount = StoredGmailAccount & {
  id: string;
  email: string;
  provider: "gmail" | "outlook";
  scope: string;
};

/** Identyfikator wiadomości dostawcy (Gmail: hex, Outlook: base64url do ~200 znaków). */
export function isValidMessageId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 256 && /^[\w=+/-]+$/.test(value);
}

/** Zwraca kontekst albo null – wtedy odpowiedź HTTP jest już wysłana. */
export async function loadMailContext(
  req: NextApiRequest,
  res: NextApiResponse,
  accountId: unknown,
  fetchImpl?: FetchLike
): Promise<MailRouteContext | null> {
  const auth = await requireUser(req, res);
  if (!auth) return null;
  const { supabase, user } = auth;

  if (!isUuid(accountId)) {
    res.status(400).json({ error: "Nieprawidłowy identyfikator konta." });
    return null;
  }

  const { data: row } = await supabase
    .from("mail_accounts")
    .select("id, email, provider, scope, access_token, refresh_token, expires_at")
    .eq("id", accountId)
    .maybeSingle();
  if (!row) {
    res.status(404).json({ error: "Nie znaleziono konta." });
    return null;
  }

  const stored = row as StoredMailAccount;
  const refresh =
    stored.provider === "outlook"
      ? async (refreshToken: string) => {
          const fresh = await refreshOutlookToken(refreshToken);
          // Microsoft rotuje tokeny odświeżania: nowy zapisujemy, stary przestaje działać.
          if (fresh?.refresh_token) {
            await supabase
              .from("mail_accounts")
              .update({ refresh_token: encryptToken(fresh.refresh_token) })
              .eq("id", stored.id);
          }
          return fresh?.access_token ?? null;
        }
      : refreshGoogleToken;

  const accessToken = await resolveGmailAccessToken(stored, {
    decrypt: decryptToken,
    encrypt: encryptToken,
    refresh,
    persist: async (encryptedAccessToken, expiresAt) => {
      await supabase
        .from("mail_accounts")
        .update({ access_token: encryptedAccessToken, expires_at: expiresAt, updated_at: new Date().toISOString() })
        .eq("id", stored.id);
    },
  });
  if (!accessToken) {
    res.status(401).json({ error: "Konto wymaga ponownego połączenia." });
    return null;
  }

  const client =
    stored.provider === "outlook"
      ? outlookProvider(createOutlookClient(accessToken, fetchImpl))
      : gmailProvider(createGmailClient(accessToken, fetchImpl), stored.email);

  return {
    supabase,
    userId: user.id,
    accountEmail: stored.email,
    provider: stored.provider,
    accountId: stored.id,
    canDeleteInMailbox: canDeleteInMailbox(stored.provider, stored.scope),
    client,
  };
}
