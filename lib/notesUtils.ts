// lib/notesUtils.ts
import { Note } from "../types";
export function sortNotes(notes: Note[]): Note[] {
  const pinned = notes.filter((n) => n.pinned && !n.archived);
  const regular = notes.filter((n) => !n.pinned && !n.archived);
  const archived = notes.filter((n) => n.archived);

  const sortByDate = (a: Note, b: Note) => {
    const dateA = new Date(a.updated_at || 0).getTime();
    const dateB = new Date(b.updated_at || 0).getTime();
    return dateB - dateA; 
  };

  return [
    ...pinned.sort(sortByDate),
    ...regular.sort(sortByDate),
    ...archived.sort(sortByDate),
  ];
}

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
