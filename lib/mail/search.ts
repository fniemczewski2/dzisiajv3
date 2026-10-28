// lib/mail/search.ts
//
// Fraza wyszukiwania wiadomości: normalizacja i przekład na składnię Gmaila oraz Microsoft Graph.

export const MAX_SEARCH_LENGTH = 200;

/** Przycina, skleja białe znaki i usuwa znaki sterujące; pusta fraza → null. */
export function normalizeSearchQuery(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = Array.from(value)
    .filter((ch) => ch.charCodeAt(0) >= 32)
    .join("")
    .replaceAll(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SEARCH_LENGTH);
  return clean.length > 0 ? clean : null;
}

/** Gmail: wyszukiwanie zawsze w folderze odbiorczym. */
export function gmailQuery(query: string | null): string {
  return query ? `in:inbox ${query}` : "in:inbox";
}

/** Graph $search: fraza w cudzysłowie; cudzysłowy i ukośniki z frazy są usuwane. */
export function outlookSearchParam(query: string): string {
  return `"${query.replaceAll(/["\\]/g, " ").trim()}"`;
}
