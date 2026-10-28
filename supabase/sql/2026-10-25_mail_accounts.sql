-- Konta poczty (Gmail, Outlook) i adresy przekierowania (wariant A).
-- Tokeny są szyfrowane przez lib/server/tokenCrypto (AES-256-GCM); w bazie nie ma treści wiadomości.
-- Uruchom PRZED wdrożeniem tras /api/mail/*.

create table if not exists public.mail_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('gmail', 'outlook')),
  email text not null check (email = lower(email) and length(email) between 3 and 320),
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, email)
);

alter table public.mail_accounts enable row level security;

create policy "mail_accounts_select_own" on public.mail_accounts
  for select using (auth.uid() = user_id);
create policy "mail_accounts_insert_own" on public.mail_accounts
  for insert with check (auth.uid() = user_id);
create policy "mail_accounts_update_own" on public.mail_accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mail_accounts_delete_own" on public.mail_accounts
  for delete using (auth.uid() = user_id);

create table if not exists public.mail_forwarding_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique check (length(token_hash) = 64),
  label text not null default '' check (length(label) <= 100),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.mail_forwarding_addresses enable row level security;

create policy "mail_forwarding_select_own" on public.mail_forwarding_addresses
  for select using (auth.uid() = user_id);
create policy "mail_forwarding_insert_own" on public.mail_forwarding_addresses
  for insert with check (auth.uid() = user_id);
create policy "mail_forwarding_update_own" on public.mail_forwarding_addresses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
