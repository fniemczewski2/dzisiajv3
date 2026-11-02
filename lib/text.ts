// lib/text.ts
//
// Liniowe operacje na tekście zamiast wyrażeń regularnych z nawracaniem (np. /^x+|x+$/g, /\s+$/):
// dane pochodzą z maili, plików i formularzy, więc czas działania nie może rosnąć kwadratowo z długością.

const WHITESPACE = /\s/;

const isWhitespace = (ch: string): boolean => WHITESPACE.test(ch);

/** Usuwa z początku i/lub końca znaki spełniające warunek. */
export function trimWhere(
  value: string,
  drop: (ch: string) => boolean,
  side: "both" | "start" | "end" = "both"
): string {
  let start = 0;
  let end = value.length;
  if (side !== "end") while (start < end && drop(value[start])) start++;
  if (side !== "start") while (end > start && drop(value[end - 1])) end--;
  return value.slice(start, end);
}

/** Usuwa z brzegów znaki z podanego zestawu (spacja w zestawie oznacza dowolny biały znak). */
export function trimChars(value: string, chars: string, side: "both" | "start" | "end" = "both"): string {
  const set = new Set(chars);
  const anyWhitespace = set.has(" ");
  return trimWhere(value, (ch) => set.has(ch) || (anyWhitespace && isWhitespace(ch)), side);
}

/**
 * Prosty adres e-mail: dokładnie jedno „@”, niepusta część lokalna, domena z kropką (nie na brzegu),
 * bez białych znaków i bez znaków z `forbidden`.
 */
export function isSimpleEmail(value: string, forbidden = ""): boolean {
  if (!value) return false;
  for (const ch of value) if (isWhitespace(ch) || forbidden.includes(ch)) return false;
  const at = value.indexOf("@");
  if (at <= 0 || at !== value.lastIndexOf("@")) return false;
  const domain = value.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  return dot > 0 && dot < domain.length - 1;
}
