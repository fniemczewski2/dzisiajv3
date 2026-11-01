// lib/server/mailProviders.ts
//
// Konfiguracja OAuth dostawców poczty dla wspólnego przepływu z lib/server/mailOAuth.ts.

import {
  GMAIL_REDIRECT_PATH,
  GMAIL_SCOPES,
  GMAIL_STATE_COOKIE,
  OUTLOOK_MAIL_REDIRECT_PATH,
  OUTLOOK_MAIL_SCOPES,
  OUTLOOK_STATE_COOKIE,
} from "@/config/server";
import { serverEnv } from "@/config/env";
import { GOOGLE_TOKEN_URL } from "@/lib/server/oauthTokens";
import { buildGoogleAuthUrl, profileEmail } from "@/lib/mail/accountRules";
import { buildMicrosoftMailAuthUrl, graphProfileEmail } from "@/lib/mail/outlookAuth";
import type { MailOAuthConfig } from "@/lib/server/mailOAuth";

export const GMAIL_OAUTH: MailOAuthConfig = {
  provider: "gmail",
  stateCookieName: GMAIL_STATE_COOKIE,
  redirectPath: GMAIL_REDIRECT_PATH,
  tokenUrl: GOOGLE_TOKEN_URL,
  profileUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
  scope: GMAIL_SCOPES.join(" "),
  credentials: () => serverEnv.google.get(),
  buildAuthUrl: ({ clientId, redirectUri, state }) =>
    buildGoogleAuthUrl({ clientId, redirectUri, scopes: GMAIL_SCOPES, state }),
  extractEmail: profileEmail,
};

export const OUTLOOK_OAUTH: MailOAuthConfig = {
  provider: "outlook",
  stateCookieName: OUTLOOK_STATE_COOKIE,
  redirectPath: OUTLOOK_MAIL_REDIRECT_PATH,
  tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  profileUrl: "https://graph.microsoft.com/v1.0/me",
  scope: OUTLOOK_MAIL_SCOPES.join(" "),
  credentials: () => serverEnv.outlook.get(),
  buildAuthUrl: buildMicrosoftMailAuthUrl,
  extractEmail: graphProfileEmail,
};
