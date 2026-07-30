// lib/server/oauthTokens.ts

import type { GoogleTokenResponse } from "@/types/googleCalendar";
import { fetchWithTimeout } from "@/lib/server/fetchWithTimeout";
import type { OutlookTokenResponse } from "@/types/outlookCalendar";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const OUTLOOK_TOKEN_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/token";

export async function refreshGoogleToken(
  refreshToken: string
): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("[oauth] Brak GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET");
    return null;
  }

  const r = await fetchWithTimeout(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!r.ok) {
    console.error("[oauth] Google refresh failed:", r.status);
    return null;
  }
  const d: GoogleTokenResponse = await r.json();
  return d.access_token ?? null;
}

export async function refreshOutlookToken(
  refreshToken: string
): Promise<OutlookTokenResponse | null> {
  const clientId = process.env.OUTLOOK_CLIENT_ID;
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("[oauth] Brak OUTLOOK_CLIENT_ID / OUTLOOK_CLIENT_SECRET");
    return null;
  }

  const r = await fetchWithTimeout(OUTLOOK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!r.ok) {
    console.error("[oauth] Outlook refresh failed:", r.status);
    return null;
  }
  return (await r.json()) as OutlookTokenResponse;
}
