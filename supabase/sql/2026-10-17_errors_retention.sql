-- supabase/sql/2026-10-17_errors_retention.sql
--
-- Retencja logów błędów: wpisy w public.errors starsze niż 30 dni są usuwane
-- codziennie o 03:15 UTC (zgodnie z polityką prywatności, sekcja 9).
--
-- Wymaga rozszerzenia pg_cron (Dashboard → Database → Extensions → pg_cron).
-- Skrypt jest idempotentny: można go uruchomić ponownie w SQL Editorze.

begin;

create extension if not exists pg_cron with schema pg_catalog;

-- Indeks pod zapytanie czyszczące i pod limit w Edge Function log-error.
create index if not exists errors_created_at_idx on public.errors (created_at);
create index if not exists errors_user_created_idx on public.errors (user_id, created_at);

create or replace function public.purge_old_error_logs()
returns integer
language sql
security definer
set search_path = ''
as $$
  with removed as (
    delete from public.errors
    where created_at < now() - interval '30 days'
    returning 1
  )
  select count(*)::integer from removed;
$$;

revoke all on function public.purge_old_error_logs() from public, anon, authenticated;

-- Jedno zadanie o stałej nazwie: najpierw usuwamy poprzednią wersję (jeśli jest).
select cron.unschedule(jobid) from cron.job where jobname = 'purge-old-error-logs';
select cron.schedule('purge-old-error-logs', '15 3 * * *', $$select public.purge_old_error_logs();$$);

commit;

-- Sprawdzenie:
--   select jobname, schedule, command, active from cron.job where jobname = 'purge-old-error-logs';
--   select * from cron.job_run_details order by start_time desc limit 5;
-- Wycofanie:
--   select cron.unschedule('purge-old-error-logs');
--   drop function if exists public.purge_old_error_logs();
