// lib/quickNotes.ts

/**
 * Komunikat, gdy baza odrzuci notatkę (trigger limitu lub ograniczenie długości,
 * kod 23514). Ten sam w aplikacji i w odpowiedzi dla Skrótów Siri.
 */
export const QUICK_NOTES_LIMIT_MESSAGE =
  "Osiągnięto limit szybkich notatek albo notatka jest za długa. Usuń starsze notatki lub skróć tekst.";
import { MAX_QUICK_NOTE_LENGTH, MAX_QUICK_NOTES_PER_SUBMIT } from "@/config/limits";

export interface QuickNote {
  id: string;
  user_id: string;
  content: string;
  source: "app" | "shortcut";
  created_at: string;
}

const BULLET = /^\s*(?:[-*•–—]|\d+[.)]|\[[ xX]?\])\s+/;

export function stripBullet(line: string): string {
  let result = line;
  for (let i = 0; i < 2 && BULLET.test(result); i++) result = result.replace(BULLET, "");
  return result.replaceAll(/\s+/g, " ").trim();
}

export function splitQuickNoteText(text: string): string[] {
  return text
    .split(/\r?\n|,/)
    .map(stripBullet)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(0, MAX_QUICK_NOTE_LENGTH))
    .slice(0, MAX_QUICK_NOTES_PER_SUBMIT);
}

export function readQuickNoteText(body: unknown): string | null {
  if (typeof body === "string") return body;
  if (body && typeof body === "object") {
    const { text } = body as { text?: unknown };
    if (typeof text === "string") return text;
  }
  return null;
}
