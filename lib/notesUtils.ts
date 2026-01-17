// lib/notesUtils.ts
import { Note } from "../types";
export function sortNotes(notes: Note[]): Note[] {
  const pinned = notes.filter((n) => n.pinned && !n.archived);
  const regular = notes.filter((n) => !n.pinned && !n.archived);
  const archived = notes.filter((n) => n.archived);

  const sortByDate = (a: Note, b: Note) => {
    const dateA = new Date(a.updated_at || 0).getTime();
    const dateB = new Date(b.updated_at || 0).getTime();
    return dateB - dateA; // Newest first
  };

  return [
    ...pinned.sort(sortByDate),
    ...regular.sort(sortByDate),
    ...archived.sort(sortByDate),
  ];
}

/**
 * Filter notes by search query (searches in title and items)
 */
export function filterNotes(notes: Note[], query: string): Note[] {
  if (!query.trim()) return notes;

  const lowerQuery = query.toLowerCase();
  return notes.filter(
    (note) =>
      note.title.toLowerCase().includes(lowerQuery) ||
      note.items.some((item) => item.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get all unique note titles for autocomplete suggestions
 */
export function getNoteTitles(notes: Note[]): string[] {
  const titles = notes.map((n) => n.title);
  const uniqueTitles = new Set(titles);
  return Array.from(uniqueTitles).sort();
}

/**
 * Export note to PDF
 */
export async function exportNoteToPDF(note: Note): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const pdfMakeModule = await import("pdfmake/build/pdfmake");
    const pdfFontsModule = await import("pdfmake/build/vfs_fonts");

    const pdfMake = (pdfMakeModule as any).default || pdfMakeModule;
    const pdfFonts = (pdfFontsModule as any).default || pdfFontsModule;

    (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs;

    const docDefinition = {
      content: [
        {
          text: note.title,
          style: "header",
          margin: [0, 0, 0, 20],
        },
        {
          ul: note.items,
          margin: [0, 0, 0, 10],
        },
      ],
      styles: {
        header: {
          fontSize: 24,
          bold: true,
        },
      },
      defaultStyle: {
        font: "Roboto",
        fontSize: 12,
      },
    };

    pdfMake.createPdf(docDefinition).download(
      `${note.title.replace(/\s+/g, "_")}.pdf`
    );
  } catch (error) {
    console.error("Błąd podczas eksportu do PDF:", error);
    alert("Wystąpił błąd podczas eksportu do PDF");
  }
}