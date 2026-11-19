-- Układ planu na ekranie głównym: jeden dzień albo tydzień (wczoraj, dzień widoku i 5 kolejnych dni).
-- Skrypt idempotentny – można go uruchomić ponownie. Uruchomić PRZED wdrożeniem aplikacji
-- (zapytania ustawień wybierają nową kolumnę – lib/db/columns.ts).

begin;

alter table public.settings
  add column if not exists dashboard_layout text not null default 'day';

alter table public.settings drop constraint if exists settings_dashboard_layout_check;
alter table public.settings
  add constraint settings_dashboard_layout_check check (dashboard_layout in ('day', 'week'));

commit;
