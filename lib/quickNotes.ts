// lib/quickNotes.ts
export const MAX_QUICK_NOTE_LENGTH = 500;
export const MAX_QUICK_NOTES_PER_SUBMIT = 20;

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
  // „- [ ] zadanie” – zdejmujemy oba znaczniki.
  for (let i = 0; i < 2 && BULLET.test(result); i++) result = result.replace(BULLET, "");
  return result.replaceAll(/\s+/g, " ").trim();
}

export function splitQuickNoteText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(stripBullet)
    .filter(Boolean)
    .map((line) => line.slice(0, MAX_QUICK_NOTE_LENGTH))
    .slice(0, MAX_QUICK_NOTES_PER_SUBMIT);
}

/** Treść żądania ze Skrótu: JSON { text } albo czysty tekst. */
export function readQuickNoteText(body: unknown): string | null {
  if (typeof body === "string") return body;
  if (body && typeof body === "object") {
    const { text } = body as { text?: unknown };
    if (typeof text === "string") return text;
  }
  return null;
}
