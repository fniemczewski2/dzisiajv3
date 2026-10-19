-- supabase/sql/2026-10-18_drop_legacy_tables.sql
--
-- Punkt 3.9 audytu: tabele, których aplikacja nie używa od wersji 1.40
-- (bills – dawny moduł rachunków, places, google_calendar_tokens – stare
-- tokeny Google, zastąpione przez connected_calendars).
--
-- OPERACJA NIEODWRACALNA. Przed uruchomieniem:
--   1. Sprawdź liczbę wierszy:  select count(*) from public.bills;  (i pozostałe)
--   2. Zrób kopię:  pg_dump "$DATABASE_URL" -t public.bills -t public.places \
--                     -t public.google_calendar_tokens > legacy_tables.sql
--   3. Uruchom ten skrypt w SQL Editorze.
-- Eksport i usuwanie konta w aplikacji pomijają nieistniejące tabele.

begin;
drop table if exists public.google_calendar_tokens;
drop table if exists public.places;
drop table if exists public.bills;
commit;
