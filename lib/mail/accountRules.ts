// lib/mail/accountRules.ts
//
// Czysta logika kont poczty: limit kont, normalizacja adresu, odpowiedź tokenowa Google,
// adres autoryzacji i bezpieczny widok konta (bez tokenów).

export const MAX_MAIL_ACCOUNTS = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/;

export type SavePlan =
  { action: "insert" } | { action: "update" } | { action: "reject"; reason: "limit" | "no_refresh" };

/**
 * Decyzja o zapisie konta. Nowe konto podlega limitowi; przy ponownym połączeniu bez refresh tokenu
 * (Google zwraca go tylko przy pierwszej zgodzie) zachowujemy poprzedni token odświeżania.
 */
export function planAccountSave(input: {
  count: number;
  exists: boolean;
  hasRefreshToken: boolean;
  limit?: number;
}): SavePlan {
  const limit = input.limit ?? MAX_MAIL_ACCOUNTS;
  if (input.exists) return { action: "update" };
  if (input.count >= limit) return { action: "reject", reason: "limit" };
  if (!input.hasRefreshToken) return { action: "reject", reason: "no_refresh" };
  return { action: "insert" };
}

export function normalizeEmail(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (v.length < 3 || v.length > 320 || !EMAIL_RE.test(v)) return null;
  return v;
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
}

export function parseTokenResponse(json: unknown, now: number = Date.now()): TokenSet | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;
  if (typeof j.access_token !== "string" || j.access_token.length === 0) return null;
  const expiresIn = typeof j.expires_in === "number" ? j.expires_in : 3600;
  return {
    accessToken: j.access_token,
    refreshToken: typeof j.refresh_token === "string" && j.refresh_token ? j.refresh_token : null,
    expiresAt: new Date(now + expiresIn * 1000).toISOString(),
  };
}

export function profileEmail(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const email = (json as Record<string, unknown>).email;
  return typeof email === "string" ? email : null;
}

export function buildGoogleAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  scopes: readonly string[];
  state: string;
}): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", params.scopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent select_account");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", params.state);
  return url.toString();
}

export interface PublicMailAccount {
  id: string;
  provider: "gmail" | "outlook";
  email: string;
  createdAt: string;
  /** Czy zgoda obejmuje przenoszenie do kosza (konta połączone przed zmianą zakresów – nie). */
  canDeleteInMailbox: boolean;
}

const DELETE_SCOPES: Record<"gmail" | "outlook", RegExp> = {
  gmail: /(^|\s)https:\/\/www\.googleapis\.com\/auth\/gmail\.modify(\s|$)/,
  outlook: /(^|\s)Mail\.ReadWrite(\s|$)/i,
};

/** Na podstawie zakresów zapisanych przy połączeniu konta. */
export function canDeleteInMailbox(provider: "gmail" | "outlook", scope: unknown): boolean {
  return typeof scope === "string" && DELETE_SCOPES[provider].test(scope);
}

/** Widok konta dla klienta: tylko pola jawne; tokeny nigdy nie opuszczają serwera. */
export function toPublicAccount(row: Record<string, unknown>): PublicMailAccount | null {
  if (typeof row.id !== "string" || typeof row.email !== "string" || typeof row.created_at !== "string") return null;
  if (row.provider !== "gmail" && row.provider !== "outlook") return null;
  return {
    id: row.id,
    provider: row.provider,
    email: row.email,
    createdAt: row.created_at,
    canDeleteInMailbox: canDeleteInMailbox(row.provider, row.scope),
  };
}
