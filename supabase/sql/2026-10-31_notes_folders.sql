-- Foldery notatek (np. „Fundacje/Zapłon”) – także struktura folderów w vaulcie Obsidiana.
alter table public.notes
  add column if not exists folder text check (folder is null or length(folder) between 1 and 200);
