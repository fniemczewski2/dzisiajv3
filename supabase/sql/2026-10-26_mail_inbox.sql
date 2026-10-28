-- Bufor przekierowanych wiadomości (wariant A). Treść jest szyfrowana (AES-256-GCM) i usuwana
-- po wygaśnięciu (expires_at). Zapis wykonuje wyłącznie serwer kluczem service role.
-- Uruchom PO 2026-10-25_mail_accounts.sql.

create table if not exists public.mail_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  forwarding_id uuid not null references public.mail_forwarding_addresses (id) on delete cascade,
  payload_encrypted text not null,
  received_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '72 hours')
);

create index if not exists mail_inbox_expires_at_idx on public.mail_inbox (expires_at);
create index if not exists mail_inbox_user_received_idx on public.mail_inbox (user_id, received_at desc);

alter table public.mail_inbox enable row level security;

create policy "mail_inbox_select_own" on public.mail_inbox
  for select using (auth.uid() = user_id);
create policy "mail_inbox_delete_own" on public.mail_inbox
  for delete using (auth.uid() = user_id);
