-- Wyjątki pojedynczych terminów serii.
--
-- 1. Wydarzenia: tabela event_overrides – jedno wystąpienie reguły (dzień z siatki) może mieć własny
--    początek i koniec, także w innym dniu. Reguła serii zostaje bez zmian, więc kolejne terminy
--    wypadają tak jak dotąd (np. cotygodniowy poniedziałek: ten jeden raz w środę, następny znów w poniedziałek).
-- 2. Zadania: kolumna tasks.recurrence_anchor – dzień, od którego liczona jest siatka reguły.
--    Dotąd kotwicą był bieżący termin (due_date), więc przeniesienie jednego zadania przesuwało
--    wszystkie kolejne wystąpienia.
--
-- Skrypt idempotentny – można go uruchomić ponownie. Uruchomić PRZED wdrożeniem aplikacji
-- (zapytania aplikacji wybierają nowe kolumny i tabelę).

begin;

-- 1. Wyjątki terminów wydarzeń cyklicznych.
--    occurrence_date – dzień z siatki reguły (klucz wystąpienia), niezależny od tego, dokąd termin przeniesiono.
--    start_time/end_time – zapis czasu lokalnego w formacie aplikacji („yyyy-MM-ddTHH:mm:ss+00”, lib/dateUtils.ts),
--    tak samo jak w events.
create table if not exists public.event_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  occurrence_date date not null,
  -- Przy odwołanym terminie (canceled) czasy są nieistotne – zostaje ostatnio znany termin.
  start_time text not null,
  end_time text not null,
  -- Termin z reguły (sprzed pierwszej zmiany) – potrzebny przy przywracaniu i w kalendarzu zewnętrznym.
  rule_start_time text,
  rule_end_time text,
  -- Termin odwołany: tego jednego razu wydarzenia nie ma.
  canceled boolean not null default false,
  -- Wyjątek obowiązuje obie strony wydarzenia współdzielonego (nie tylko autora wyjątku).
  shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_id, occurrence_date)
);

create index if not exists event_overrides_user_date_idx
  on public.event_overrides (user_id, occurrence_date);

alter table public.event_overrides enable row level security;

-- Dostęp do wydarzenia: właściciel serii albo osoba, której ją udostępniono.
create or replace function public.can_access_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id
      and ((select auth.uid()) = e.user_id or (select auth.uid()) = e.shared_with_id)
  )
$$;

drop policy if exists "event_overrides_select_own" on public.event_overrides;
create policy "event_overrides_select_own" on public.event_overrides
  for select using (
    (select auth.uid()) = user_id
    or (shared and public.can_access_event(event_id))
  );

drop policy if exists "event_overrides_insert_own" on public.event_overrides;
create policy "event_overrides_insert_own" on public.event_overrides
  for insert with check ((select auth.uid()) = user_id and public.can_access_event(event_id));

drop policy if exists "event_overrides_update_own" on public.event_overrides;
-- Wyjątek „dla obu stron” może zmienić i cofnąć każda ze stron wydarzenia.
create policy "event_overrides_update_own" on public.event_overrides
  for update
  using ((select auth.uid()) = user_id or (shared and public.can_access_event(event_id)))
  with check ((select auth.uid()) = user_id or (shared and public.can_access_event(event_id)));

drop policy if exists "event_overrides_delete_own" on public.event_overrides;
create policy "event_overrides_delete_own" on public.event_overrides
  for delete using ((select auth.uid()) = user_id or (shared and public.can_access_event(event_id)));

revoke all on public.event_overrides from anon;

-- 2. Kotwica reguły zadania cyklicznego. Dla istniejących zadań = bieżący termin (stan sprzed zmiany).
alter table public.tasks
  add column if not exists recurrence_anchor date;

update public.tasks
  set recurrence_anchor = due_date
  where is_recurring is true and recurrence_anchor is null and due_date is not null;

commit;
