// types/notes.ts

export interface Note {
  id: string;
  title: string;
  items: string[];
  bg_color: string;
  user_id: string;
  pinned?: boolean;
  archived?: boolean;
  /** Folder (np. „Fundacje/Zapłon”); null = katalog główny. */
  folder?: string | null;
  updated_at?: string;
}
