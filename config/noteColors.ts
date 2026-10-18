// config/noteColors.ts
//
// Kolory tła notatek. Klucze to wartości kolumny `notes.bg_color` w bazie
// (historyczne nazwy klas Tailwinda) – nie zmieniaj ich. Klasy korzystają
// z tokenów --note-* (jasny i ciemny motyw w styles/globals.css).

export interface NoteColor {
  key: string;
  label: string;
  className: string;
}

export const NOTE_COLORS: readonly NoteColor[] = [
  { key: "zinc-50", label: "Szary", className: "bg-note-gray border-note-gray-line" },
  { key: "yellow-100", label: "Żółty", className: "bg-note-yellow border-note-yellow-line" },
  { key: "green-100", label: "Zielony", className: "bg-note-green border-note-green-line" },
  { key: "cyan-100", label: "Turkusowy", className: "bg-note-cyan border-note-cyan-line" },
  { key: "red-100", label: "Czerwony", className: "bg-note-red border-note-red-line" },
];

export const DEFAULT_NOTE_COLOR = NOTE_COLORS[0].key;

const BY_KEY = new Map(NOTE_COLORS.map((c) => [c.key, c]));

export function noteColorClass(key: string | null | undefined): string {
  return (BY_KEY.get(key ?? "") ?? NOTE_COLORS[0]).className;
}

export function noteColorLabel(key: string | null | undefined): string {
  return (BY_KEY.get(key ?? "") ?? NOTE_COLORS[0]).label;
}
