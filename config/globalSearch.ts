// config/globalSearch.ts

export interface GlobalSearchSource {
  table: string;
  label: string;
  href: string;
  select: string;
  searchColumn: string;
  labelColumn: string;
  sublabelColumn?: string;
}

export const GLOBAL_SEARCH_MIN_CHARS = 2;
export const GLOBAL_SEARCH_LIMIT = 5;

export const GLOBAL_SEARCH_SOURCES: GlobalSearchSource[] = [
  { table: "tasks", label: "Zadania", href: "/tasks", select: "id, title, due_date", searchColumn: "title", labelColumn: "title", sublabelColumn: "due_date" },
  { table: "events", label: "Wydarzenia", href: "/calendar", select: "id, title, start_time", searchColumn: "title", labelColumn: "title", sublabelColumn: "start_time" },
  { table: "notes", label: "Notatki", href: "/notes", select: "id, title", searchColumn: "title", labelColumn: "title" },
  { table: "letters", label: "Pisma", href: "/notes/letters", select: "id, signature, recipient", searchColumn: "recipient", labelColumn: "recipient", sublabelColumn: "signature" },
  { table: "people", label: "Osoby", href: "/people", select: "id, first_name", searchColumn: "first_name", labelColumn: "first_name" },
  { table: "places", label: "Miejsca", href: "/places", select: "id, name", searchColumn: "name", labelColumn: "name" },
  { table: "recipes", label: "Przepisy", href: "/notes/recipes", select: "id, name", searchColumn: "name", labelColumn: "name" },
  { table: "movies", label: "Filmy", href: "/notes/movies", select: "id, title", searchColumn: "title", labelColumn: "title" },
];