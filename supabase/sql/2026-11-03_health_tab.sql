-- Zakładka „Zdrowie”: pełne dane o śnie (fazy) i rejestr tętna ze Skrótów iOS oraz ręczne treningi.
-- Dane o zdrowiu (art. 9 RODO): zapis ze Skrótów wykonuje serwer kluczem service role po sprawdzeniu zgody;
-- użytkownik czyta i usuwa własne wiersze (RLS). Uruchom PO 2026-10-30_health_shortcuts.sql.

create table if not exists public.health_sleep_segments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Doba (data przebudzenia) przesłana przez Skrót; ponowne wysłanie tej doby zastępuje jej odcinki.
  date date not null,
  stage text not null check (stage in ('deep', 'rem', 'core', 'asleep', 'awake', 'in_bed')),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  synced_at timestamptz not null default now(),
  check (ended_at > started_at and ended_at - started_at <= interval '24 hours'),
  unique (user_id, date, started_at, stage)
);
create index if not exists health_sleep_segments_user_date_idx on public.health_sleep_segments (user_id, date);

create table if not exists public.health_heart_rate (
  user_id uuid not null references auth.users (id) on delete cascade,
  recorded_at timestamptz not null,
  bpm smallint not null check (bpm between 20 and 250),
  primary key (user_id, recorded_at)
);

alter table public.health_sleep_segments enable row level security;
alter table public.health_heart_rate enable row level security;

drop policy if exists "health_sleep_select_own" on public.health_sleep_segments;
create policy "health_sleep_select_own" on public.health_sleep_segments for select using (auth.uid() = user_id);
drop policy if exists "health_sleep_delete_own" on public.health_sleep_segments;
create policy "health_sleep_delete_own" on public.health_sleep_segments for delete using (auth.uid() = user_id);

drop policy if exists "health_heart_rate_select_own" on public.health_heart_rate;
create policy "health_heart_rate_select_own" on public.health_heart_rate for select using (auth.uid() = user_id);
drop policy if exists "health_heart_rate_delete_own" on public.health_heart_rate;
create policy "health_heart_rate_delete_own" on public.health_heart_rate for delete using (auth.uid() = user_id);

-- Ręczne treningi: użytkownik dodaje własne wiersze (source = 'manual') i tylko przy udzielonej zgodzie.
drop policy if exists "health_workouts_insert_manual" on public.health_workouts;
create policy "health_workouts_insert_manual" on public.health_workouts
  for insert
  with check (
    auth.uid() = user_id
    and source = 'manual'
    and exists (select 1 from public.settings s where s.user_id = auth.uid() and s.health_consent_at is not null)
  );
