-- supabase/sql/2026-10-18_audit_hardening.sql
--
-- Utwardzenie bazy po audycie (punkty 2.5, 3.1, 3.3, 3.10 oraz zgoda z 3.6).
-- Skrypt jest idempotentny – można go uruchomić ponownie w SQL Editorze.
-- Nie usuwa danych użytkowników poza zdublowanymi subskrypcjami push.
-- Przed uruchomieniem na produkcji: kopia zapasowa (Database → Backups).

begin;

-- 3.6 – data wyraźnej zgody na zapis nastroju (art. 9 RODO).
alter table public.settings add column if not exists mood_consent_at timestamptz;

-- 2.4 – prywatny bucket na duże eksporty danych (link podpisany, ważny 10 minut).
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('user-exports', 'user-exports', false)
    on conflict (id) do nothing;
  end if;
end $$;

-- 3.10 – jedno urządzenie = jedna subskrypcja push. Najpierw usuwamy duplikaty
-- (zostaje najnowszy wpis dla danego adresu endpoint), potem indeks unikalny.
delete from public.push_subscriptions older
using public.push_subscriptions newer
where older.subscription ->> 'endpoint' = newer.subscription ->> 'endpoint'
  and (coalesce(older.created_at, '-infinity'), older.id) < (coalesce(newer.created_at, '-infinity'), newer.id);

create unique index if not exists push_subscriptions_endpoint_uidx
  on public.push_subscriptions ((subscription ->> 'endpoint'));

-- 2.5 – zdublowane indeksy (ten sam zakres pokrywa indeks unikalny lub szerszy).
drop index if exists public.daily_habits_user_date_idx;          -- = daily_habits_user_date_key
drop index if exists public.mood_entries_user_date_idx;          -- = mood_entries_user_id_date_key
drop index if exists public.meeting_polls_share_token_idx;       -- = meeting_polls_share_token_uidx
drop index if exists public.letters_user_id_idx;                 -- ⊂ letters_user_issue_date_idx
drop index if exists public.budget_categories_user_year_idx;     -- ⊂ budget_categories_user_year_name_key
drop index if exists public.events_calendar_id_idx;              -- ⊂ events_calendar_google_event_uidx
drop index if exists public.meeting_poll_availabilities_response_id_idx; -- ⊂ …_response_id_date_start_time_key
drop index if exists public.meeting_poll_dates_poll_id_idx;      -- ⊂ meeting_poll_dates_poll_id_date_key
drop index if exists public.slack_deleted_tasks_user_idx;        -- ⊂ slack_deleted_tasks_user_list_idx
drop index if exists public.slack_task_links_list_idx;           -- ⊂ slack_task_links_list_item_idx

-- 2.5 – brakujące indeksy: wyszukiwanie przystanków, filtry RLS i klucze obce.
create extension if not exists pg_trgm with schema extensions;
do $$
declare
  trgm_schema text;
begin
  -- pg_trgm może być zainstalowane w schemacie extensions albo public.
  select extnamespace::regnamespace::text into trgm_schema from pg_extension where extname = 'pg_trgm';
  execute format(
    'create index if not exists stops_stop_name_trgm_idx on public.stops using gin (stop_name %I.gin_trgm_ops)',
    trgm_schema
  );
end $$;
create index if not exists stops_lat_lon_idx on public.stops (stop_lat, stop_lon);
create index if not exists task_reminders_user_idx on public.task_reminders (user_id);
create index if not exists transactions_category_idx on public.transactions (category_id) where category_id is not null;
create index if not exists transactions_profile_idx on public.transactions (profile_id) where profile_id is not null;
create index if not exists recurring_bills_category_idx on public.recurring_bills (category_id) where category_id is not null;
create index if not exists recurring_bills_profile_idx on public.recurring_bills (profile_id) where profile_id is not null;
create index if not exists day_schema_choices_schema_idx on public.day_schema_choices (schema_id) where schema_id is not null;
do $$
begin
  -- Indeks przestrzenny tylko, gdy kolumna geom istnieje (PostGIS).
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'stops' and column_name = 'geom') then
    execute 'create index if not exists stops_geom_gist_idx on public.stops using gist (geom)';
  end if;
end $$;

-- 3.1 – rola anon (żądania bez logowania) nie potrzebuje dostępu do tabel
-- poza publicznymi wizytówkami; publiczne ankiety obsługuje serwer kluczem
-- service_role. RLS nadal obowiązuje – to dodatkowa warstwa ochrony.
revoke all on all tables in schema public from anon;
grant select on public.vcard_profiles to anon;
-- TRUNCATE omija RLS; TRIGGER i REFERENCES nie są potrzebne aplikacji.
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
-- Nowe tabele nie dostaną automatycznie pełnych praw dla anon.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke truncate, trigger, references on tables from authenticated;

-- 3.3 – każdy wiersz z danymi musi mieć właściciela. NOT NULL ustawiamy tylko
-- tam, gdzie nie ma pustych wartości; pozostałe tabele są wypisywane w NOTICE
-- (wiersze bez właściciela trzeba najpierw przypisać albo usunąć ręcznie).
do $$
declare
  t text;
  orphans bigint;
begin
  foreach t in array array[
    'bills', 'connected_calendars', 'daily_habits', 'day_schemas', 'events', 'movies', 'notes',
    'places', 'products', 'push_subscriptions', 'recipes', 'reports', 'shopping_lists', 'streaks', 'tasks'
  ] loop
    continue when to_regclass('public.' || t) is null;
    execute format('select count(*) from public.%I where user_id is null', t) into orphans;
    if orphans = 0 then
      execute format('alter table public.%I alter column user_id set not null', t);
    else
      raise notice 'Tabela %: % wierszy bez user_id – NOT NULL pominięte.', t, orphans;
    end if;
  end loop;
end $$;
-- errors.user_id i meeting_poll_responses.user_id zostają opcjonalne z założenia:
-- błąd może wystąpić przed zalogowaniem, a uczestnik ankiety nie musi mieć konta.

commit;
