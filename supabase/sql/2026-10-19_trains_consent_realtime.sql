-- supabase/sql/2026-10-19_trains_consent_realtime.sql
--
-- Zmiany bazy do wersji z audytem 3 (idempotentne – można uruchomić ponownie):
--   * user_trains.planned_arrival – planowy przyjazd do stacji docelowej („HH:MM”),
--     zapisywany po pierwszej odpowiedzi PKP PLK; wyznacza koniec okna odpytywania
--     (3 h po planowym przyjeździe);
--   * settings.mood_consent_version – wersja treści zgody na moduł nastroju (art. 7 ust. 1 RODO);
--   * shopping_lists w publikacji supabase_realtime – listy zakupów odświeżają się na żywo.
-- Bez tego skryptu aplikacja działa: przyjazd i wersja zgody nie są zapisywane,
-- a listy odświeżają się dopiero przy ponownym pobraniu.

begin;

alter table public.user_trains add column if not exists planned_arrival text;
alter table public.settings add column if not exists mood_consent_version text;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'shopping_lists'
     ) then
    execute 'alter publication supabase_realtime add table public.shopping_lists';
  end if;
end $$;

commit;
