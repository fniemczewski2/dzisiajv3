// lib/server/calendarFeedTokens.ts
//
// Token kanału kalendarza (.ics). Osobny od tokenu Skrótów: adres kanału trafia do aplikacji kalendarza
// i bywa synchronizowany między urządzeniami, więc jego wyciek nie może dawać zapisu przez API Skrótów.
// W bazie wyłącznie SHA-256 (jak lib/server/shortcutTokens.ts).

import { createHash, randomBytes } from "node:crypto";

const FEED_TOKEN_PREFIX = "dzc_";

export function generateFeedToken(): string {
  return `${FEED_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashFeedToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Token z segmentu ścieżki „dzc_….ics”; null – nieprawidłowy format. */
export function feedTokenFromPath(segment: unknown): string | null {
  if (typeof segment !== "string") return null;
  const token = segment.endsWith(".ics") ? segment.slice(0, -4) : segment;
  return /^dzc_[\w-]{40,60}$/.test(token) ? token : null;
}
