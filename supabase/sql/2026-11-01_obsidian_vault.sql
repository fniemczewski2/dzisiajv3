-- Synchronizacja z vaultem Obsidiana w OneDrive (folder aplikacji) lub Google Drive (folder „dzisiaj.fun”).
-- Jedno połączenie na użytkownika. Tokeny szyfrowane w aplikacji (AES-256-GCM).

create table if not exists public.vault_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null check (provider in ('onedrive', 'gdrive')),
  email text not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz,
  scope text not null,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vault_sync_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null,
  file_id text not null,
  app_hash text not null,
  remote_hash text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.vault_connections enable row level security;
alter table public.vault_sync_state enable row level security;

create policy "vault_connections_own" on public.vault_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vault_sync_state_own" on public.vault_sync_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
