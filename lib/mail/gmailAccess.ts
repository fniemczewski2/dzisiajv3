// lib/mail/gmailAccess.ts
//
// Zwraca ważny access token konta Gmail: z bazy, gdy jeszcze jest ważny, albo po odświeżeniu.
// Zależności (szyfrowanie, odświeżenie u Google, zapis) są wstrzykiwane, więc logika jest testowalna.

export interface StoredGmailAccount {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
}

export interface AccessTokenDeps {
  decrypt(value: string): string;
  encrypt(value: string): string;
  refresh(refreshToken: string): Promise<string | null>;
  persist(encryptedAccessToken: string, expiresAt: string): Promise<void>;
  now?: number;
}

/** Zapas czasu: token wygasający w ciągu minuty traktujemy jak już nieważny. */
export const ACCESS_TOKEN_SKEW_MS = 60_000;
/** Przybliżony czas życia tokenu po odświeżeniu (Google zwraca go zwykle po godzinie). */
const REFRESHED_TOKEN_TTL_MS = 3_600_000;

export async function resolveGmailAccessToken(
  account: StoredGmailAccount,
  deps: AccessTokenDeps
): Promise<string | null> {
  const now = deps.now ?? Date.now();
  const expiresAt = account.expires_at ? Date.parse(account.expires_at) : 0;
  if (expiresAt - ACCESS_TOKEN_SKEW_MS > now) return deps.decrypt(account.access_token);

  if (!account.refresh_token) return null;
  const fresh = await deps.refresh(deps.decrypt(account.refresh_token));
  if (!fresh) return null;
  await deps.persist(deps.encrypt(fresh), new Date(now + REFRESHED_TOKEN_TTL_MS).toISOString());
  return fresh;
}
