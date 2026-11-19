-- Wydanie 1.45.0: briefing dnia, kanał .ics (WebCal), płatności ze Skrótów (Apple Pay), bilety z poczty,
-- skrzynki do wyszukiwania potwierdzeń ePUAP / e-Doręczeń.
-- Skrypt idempotentny – można go uruchomić ponownie. Uruchomić PRZED wdrożeniem aplikacji 1.45.0
-- (zapytania aplikacji wybierają nowe kolumny).

begin;

-- 1. Briefing dnia (ustawienia) i skrzynki przeszukiwane w module Pisma.
alter table public.settings
  add column if not exists brief_morning_time text not null default '07:00',
  add column if not exists brief_evening_time text not null default '21:00',
  add column if not exists brief_evening_mode text not null default 'both',
  add column if not exists brief_dismissed_morning date,
  add column if not exists brief_dismissed_evening date,
  add column if not exists letter_mail_accounts text[];

alter table public.settings drop constraint if exists settings_brief_morning_time_check;
alter table public.settings
  add constraint settings_brief_morning_time_check check (brief_morning_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
alter table public.settings drop constraint if exists settings_brief_evening_time_check;
alter table public.settings
  add constraint settings_brief_evening_time_check check (brief_evening_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
alter table public.settings drop constraint if exists settings_brief_evening_mode_check;
alter table public.settings
  add constraint settings_brief_evening_mode_check check (brief_evening_mode in ('summary', 'tomorrow', 'both'));
alter table public.settings drop constraint if exists settings_letter_mail_accounts_check;
alter table public.settings
  add constraint settings_letter_mail_accounts_check
  check (letter_mail_accounts is null or cardinality(letter_mail_accounts) <= 10);

-- 2. Kanał kalendarza (.ics / WebCal): jeden token na użytkownika, w bazie tylko skrót SHA-256.
create table if not exists public.calendar_feed_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token_hash text not null unique check (length(token_hash) = 64),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.calendar_feed_tokens enable row level security;

drop policy if exists "calendar_feed_tokens_select_own" on public.calendar_feed_tokens;
create policy "calendar_feed_tokens_select_own" on public.calendar_feed_tokens
  for select using ((select auth.uid()) = user_id);
-- Zapis i usunięcie wykonuje wyłącznie serwer (klucz service role) – bez polityk insert/update/delete.
revoke all on public.calendar_feed_tokens from anon;

-- 3. Transakcje ze Skrótu iOS (Apple Pay): nowa wartość źródła.
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'transactions'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%source%'
  loop
    execute format('alter table public.transactions drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.transactions
  add constraint transactions_source_check check (source in ('manual', 'csv', 'legacy', 'shortcut'));

-- 4. Bilety z poczty: źródło wpisu i znacznik „do sprawdzenia”.
alter table public.user_trains
  add column if not exists source text not null default 'manual',
  add column if not exists needs_review boolean not null default false;

alter table public.user_trains drop constraint if exists user_trains_source_check;
alter table public.user_trains
  add constraint user_trains_source_check check (source in ('manual', 'mail'));

-- Ten sam bilet przekierowany dwa razy nie tworzy drugiego wpisu.
create unique index if not exists user_trains_mail_dedupe
  on public.user_trains (user_id, date, train_number, departure_time, wagon, seat)
  where source = 'mail';

-- Użytkownik poprawia i zatwierdza wpis (dotąd tabela miała tylko insert i delete).
drop policy if exists "user_trains_update_own" on public.user_trains;
create policy "user_trains_update_own" on public.user_trains
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 5. Adresy przekierowania: osobny rodzaj adresu na bilety.
alter table public.mail_forwarding_addresses
  add column if not exists kind text not null default 'mail';

alter table public.mail_forwarding_addresses drop constraint if exists mail_forwarding_addresses_kind_check;
alter table public.mail_forwarding_addresses
  add constraint mail_forwarding_addresses_kind_check check (kind in ('mail', 'tickets'));

commit;

-- Sprawdzenie (powinno zwrócić 6 wierszy):
-- select column_name from information_schema.columns
--  where table_schema = 'public' and table_name = 'settings'
--    and column_name in ('brief_morning_time','brief_evening_time','brief_evening_mode',
--                        'brief_dismissed_morning','brief_dismissed_evening','letter_mail_accounts');
