// lib/notes/export.ts
//
// Eksport notatek do Markdown: pojedyncza notatka (z nagłówkiem YAML jak w synchronizacji z Obsidianem) albo wszystkie
// w jednym pliku (do archiwum lub przeniesienia poza aplikację).

import type { Note } from "@/types/notes";
import { noteToMarkdown } from "@/lib/obsidian/markdown";
import { downloadBlob, safeName } from "@/lib/letterArchive";
import { getAppDate } from "@/lib/dateUtils";
import { normalizeFolder } from "@/lib/notes/folders";

export interface MarkdownFile {
  fileName: string;
  content: string;
}

export function noteMarkdownFile(note: Note): MarkdownFile {
  return { fileName: `${safeName(note.title || "notatka", 80)}.md`, content: noteToMarkdown(note) };
}

/** Wszystkie notatki w jednym pliku: sekcja „## Tytuł” z folderem i treścią, oddzielone linią. */
export function allNotesMarkdown(notes: readonly Note[], date: string): MarkdownFile {
  const sections = notes.map((note) => {
    const folder = normalizeFolder(note.folder);
    const meta = [folder ? `Folder: ${folder}` : "", note.archived ? "Zarchiwizowana" : ""].filter(Boolean).join(" · ");
    return [`## ${note.title}`, meta, "", ...note.items].filter((line, i) => i !== 1 || line !== "").join("\n");
  });
  return {
    fileName: `notatki-${date}.md`,
    content: `# Notatki (${date})\n\n${sections.join("\n\n---\n\n")}\n`,
  };
}

function download({ fileName, content }: MarkdownFile): void {
  downloadBlob(new Blob([content], { type: "text/markdown;charset=utf-8" }), fileName);
}

export const downloadNoteMarkdown = (note: Note): void => download(noteMarkdownFile(note));

export const downloadAllNotesMarkdown = (notes: readonly Note[]): void =>
  download(allNotesMarkdown(notes, getAppDate()));
