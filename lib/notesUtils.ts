// lib/notesUtils.ts

import { Note } from "@/types/notes";

export function filterNotes(notes: Note[], query: string): Note[] {
  if (!query.trim()) return notes;

  const lowerQuery = query.toLowerCase();
  return notes.filter(
    (note) =>
      note.title.toLowerCase().includes(lowerQuery) ||
      note.items.some((item) => item.toLowerCase().includes(lowerQuery))
  );
}

export function getNoteTitles(notes: Note[]): string[] {
  const titles = notes.map((n) => n.title);
  const uniqueTitles = new Set(titles);
  return Array.from(uniqueTitles).sort((a, b) => a.localeCompare(b, "pl"));
}

const WHOLE_LINE_URL_RE = /^(https?:\/\/)?([\w.-]+\.[a-z]{2,})(\/\S*)?$/i;

/**
 * Normalizes one raw textarea line before it's stored as a note item: trims
 * whitespace and adds an https:// scheme when the whole line is a bare
 * domain (e.g. "google.pl"). Previously duplicated near-verbatim in both
 * NoteForm.tsx and NoteEditForm.tsx.
 */
export function normalizeNoteLine(line: string): string {
  const cleaned = line.trim();
  if (WHOLE_LINE_URL_RE.test(cleaned) && !/^https?:\/\//i.test(cleaned)) {
    return `https://${cleaned}`;
  }
  return cleaned;
}
