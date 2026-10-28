// lib/mail/outlookAuth.ts
//
// Adres autoryzacji Microsoft dla poczty oraz odczyt adresu konta z Graph.

import { OUTLOOK_MAIL_SCOPES } from "@/lib/mail/outlook";

export const OUTLOOK_MAIL_REDIRECT_PATH = "/api/mail/outlook/callback";

export function buildMicrosoftMailAuthUrl(params: { clientId: string; redirectUri: string; state: string }): string {
  const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", OUTLOOK_MAIL_SCOPES.join(" "));
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", params.state);
  return url.toString();
}

/** Adres konta z odpowiedzi /me: pole `mail`, a gdy go brak – `userPrincipalName`. */
export function graphProfileEmail(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;
  const candidate = typeof j.mail === "string" && j.mail ? j.mail : j.userPrincipalName;
  return typeof candidate === "string" && candidate ? candidate : null;
}
