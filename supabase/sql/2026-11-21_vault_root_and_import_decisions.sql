-- Vault Obsidiana w folderze wskazanym przez użytkownika (np. „Apps/remotely-save/Zeszyt” – Remotely Save)
-- oraz decyzje o duplikatach przy imporcie osób z vaultu (scal / utwórz / pomiń).

alter table public.vault_connections add column if not exists root_path text
  check (root_path is null or (length(root_path) between 1 and 300 and root_path !~ '(^|/)\.\.(/|$)'));

create table if not exists public.vault_import_decisions (
  user_id uuid not null references auth.users (id) on delete cascade,
  file_id text not null,
  path text not null,
  status text not null default 'pending' check (status in ('pending', 'merge', 'create', 'skip')),
  person_id uuid references public.people (id) on delete set null,
  candidate_ids uuid[] not null default '{}',
  "values" jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  primary key (user_id, file_id)
);

create index if not exists vault_import_decisions_person_id_idx on public.vault_import_decisions (person_id);

alter table public.vault_import_decisions enable row level security;

create policy "vault_import_decisions_own" on public.vault_import_decisions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
