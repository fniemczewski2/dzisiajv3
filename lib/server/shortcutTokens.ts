// lib/server/shortcutTokens.ts

import { createHash, randomBytes } from "node:crypto";

export const SHORTCUT_TOKEN_PREFIX = "dzs_";

/** Nowy token: 32 losowe bajty. Jawna wartość trafia do użytkownika tylko raz. */
export function generateShortcutToken(): string {
  return `${SHORTCUT_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

/**
 * W bazie trzymamy wyłącznie SHA-256. Token ma 256 bitów entropii, więc
 * zwykły (niesolony) skrót wystarcza, a pozwala wyszukać wiersz po indeksie.
 */
export function hashShortcutToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function looksLikeShortcutToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith(SHORTCUT_TOKEN_PREFIX) &&
    value.length > SHORTCUT_TOKEN_PREFIX.length + 20 &&
    value.length < 200
  );
}
