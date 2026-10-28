-- Wiadomości usunięte z aplikacji (bez usuwania w skrzynce). Tylko identyfikatory – bez treści.
-- Uruchom PO 2026-10-25_mail_accounts.sql. Wiersze znikają razem z kontem (kaskada).

create table if not exists public.mail_hidden_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.mail_accounts (id) on delete cascade,
  message_id text not null check (length(message_id) between 1 and 256),
  created_at timestamptz not null default now(),
  unique (account_id, message_id)
);

create index if not exists mail_hidden_messages_account_idx on public.mail_hidden_messages (account_id);

alter table public.mail_hidden_messages enable row level security;

create policy "mail_hidden_select_own" on public.mail_hidden_messages
  for select using (auth.uid() = user_id);
create policy "mail_hidden_insert_own" on public.mail_hidden_messages
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.mail_accounts a where a.id = account_id and a.user_id = auth.uid())
  );
create policy "mail_hidden_delete_own" on public.mail_hidden_messages
  for delete using (auth.uid() = user_id);
