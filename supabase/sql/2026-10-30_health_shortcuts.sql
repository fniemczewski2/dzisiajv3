-- Dane o zdrowiu przekazywane ze Skrótów iOS (Apple Zdrowie): kroki, tętno, sen, treningi.
-- Szczególna kategoria danych (art. 9 RODO): zapis tylko przy aktualnej zgodzie (settings.health_consent_*),
-- wykonywany przez serwer kluczem service role; użytkownik czyta i usuwa własne wiersze (RLS).

alter table public.settings
  add column if not exists health_consent_at timestamptz,
  add column if not exists health_consent_version text;

create table if not exists public.health_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  steps integer check (steps between 0 and 200000),
  heart_rate_avg smallint check (heart_rate_avg between 20 and 250),
  heart_rate_min smallint check (heart_rate_min between 20 and 250),
  heart_rate_max smallint check (heart_rate_max between 20 and 250),
  heart_rate_resting smallint check (heart_rate_resting between 20 and 250),
  sleep_minutes smallint check (sleep_minutes between 0 and 1440),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.health_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  activity text not null check (length(activity) between 1 and 60),
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_minutes smallint check (duration_minutes between 0 and 1440),
  distance_km numeric(7, 2) check (distance_km between 0 and 10000),
  energy_kcal smallint check (energy_kcal between 0 and 20000),
  heart_rate_avg smallint check (heart_rate_avg between 20 and 250),
  source text not null default 'shortcut',
  created_at timestamptz not null default now(),
  unique (user_id, started_at, activity)
);

alter table public.health_daily enable row level security;
alter table public.health_workouts enable row level security;

create policy "health_daily_select_own" on public.health_daily for select using (auth.uid() = user_id);
create policy "health_daily_delete_own" on public.health_daily for delete using (auth.uid() = user_id);
create policy "health_workouts_select_own" on public.health_workouts for select using (auth.uid() = user_id);
create policy "health_workouts_delete_own" on public.health_workouts for delete using (auth.uid() = user_id);
