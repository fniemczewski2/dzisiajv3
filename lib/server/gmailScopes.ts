// lib/server/gmailScopes.ts

/**
 * Zakresy Gmail API (wariant B). gmail.modify i gmail.send są zakresami „restricted”:
 * przed udostępnieniem wszystkim użytkownikom aplikacja wymaga weryfikacji Google.
 */
export const GMAIL_SCOPES = [
  // gmail.modify obejmuje odczyt i przenoszenie do kosza (bez trwałego usuwania).
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;

export const GMAIL_STATE_COOKIE = "mail_gmail_state";
export const GMAIL_REDIRECT_PATH = "/api/mail/gmail/callback";
