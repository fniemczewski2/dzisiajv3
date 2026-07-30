-- supabase/migrations/20260730000000_baseline_schema.sql
--
-- Migracja bazowa odtwarzająca schemat, który dziś istnieje na produkcji
-- (wyciągnięty zapytaniem introspect_schema.sql, bez użycia `supabase db
-- pull`, żeby ominąć wymóg Docker Desktop na Windows). Ta migracja NIE
-- powinna być uruchamiana przez `supabase db push` na już istniejącej
-- bazie - służy jako punkt odniesienia oznaczony jako już zastosowany,
-- patrz instrukcja w wiadomości w czacie.
--
-- Dwa świadome uproszczenia względem rzeczywistej bazy (introspekcja przez
-- information_schema/pg_policies ich nie ujawnia):
--   1) `recipes.category` to enum `recipe_category` - nie znam realnych
--      etykiet, więc tworzę go z placeholderem do uzupełnienia.
--   2) `stops.geom` to kolumna PostGIS `geometry` - tu bez podtypu/SRID,
--      bo introspekcja tego nie pokazuje.
--   3) Ewentualne funkcje/triggery (np. synchronizacja auth.users ->
--      public.users) NIE są tu odtworzone - introspect_schema.sql ich
--      nie obejmował.

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
create extension if not exists postgis;

-- UZUPEŁNIJ realnymi wartościami (zapytanie w wiadomości w czacie).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'recipe_category') then
    create type public.recipe_category as enum ('sniadanie', 'obiad', 'kolacja', 'deser', 'przekaska');
  end if;
end $$;

-- ============================================================
-- Tabele niezależne (bez kluczy obcych do innych tabel public.*)
-- ============================================================

create table if not exists public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  year integer not null,
  name text not null,
  is_monthly boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  monthly_amounts numeric[] default array_fill(0::numeric, array[12]),
  constraint budget_categories_user_year_name_key unique (user_id, year, name)
);
alter table public.budget_categories enable row level security;
create policy "Users manage own budget categories" on public.budget_categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  jan_rate numeric(10,2) not null default 0,
  feb_rate numeric(10,2) not null default 0,
  mar_rate numeric(10,2) not null default 0,
  apr_rate numeric(10,2) not null default 0,
  may_rate numeric(10,2) not null default 0,
  jun_rate numeric(10,2) not null default 0,
  jul_rate numeric(10,2) not null default 0,
  aug_rate numeric(10,2) not null default 0,
  sep_rate numeric(10,2) not null default 0,
  oct_rate numeric(10,2) not null default 0,
  nov_rate numeric(10,2) not null default 0,
  dec_rate numeric(10,2) not null default 0,
  user_id uuid default auth.uid()
);
alter table public.budgets enable row level security;
create policy "Users can view own records" on public.budgets for select using ((select auth.uid()) = user_id);
create policy "Users can update own records" on public.budgets for update using ((select auth.uid()) = user_id);
create policy "Users can insert own records" on public.budgets for insert with check ((select auth.uid()) = user_id);
create policy "Users can delete own records" on public.budgets for delete using ((select auth.uid()) = user_id);

create table if not exists public.connected_calendars (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  provider varchar(50) not null,
  account_email varchar(255) not null,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  sync_token text,
  created_at timestamptz default now(),
  google_calendar_id text default 'primary',
  calendar_name text,
  constraint connected_calendars_user_account_calendar_key unique (user_id, account_email, google_calendar_id)
);
-- Postgres cicho pomija drugi unique constraint o identycznych kolumnach
-- zadeklarowany w tym samym CREATE TABLE - stąd osobny ALTER TABLE,
-- dokładnie tak, jak ten drugi constraint musiał powstać na produkcji.
alter table public.connected_calendars
  add constraint connected_calendars_user_calendar_unique unique (user_id, account_email, google_calendar_id);
alter table public.connected_calendars enable row level security;
create policy "connected_calendars_select_own" on public.connected_calendars for select using (auth.uid() = user_id);
create policy "connected_calendars_insert_own" on public.connected_calendars for insert with check (auth.uid() = user_id);
create policy "connected_calendars_update_own" on public.connected_calendars for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "connected_calendars_delete_own" on public.connected_calendars for delete using (auth.uid() = user_id);
create policy "Users can view own connected calendars" on public.connected_calendars for select using (auth.uid() = user_id);
create policy "Users can insert own connected calendars" on public.connected_calendars for insert with check (auth.uid() = user_id);
create policy "Users can update own connected calendars" on public.connected_calendars for update using (auth.uid() = user_id);
create policy "Users can delete own connected calendars" on public.connected_calendars for delete using (auth.uid() = user_id);

create table if not exists public.daily_habits (
  date date not null,
  pills boolean not null default false,
  bath boolean not null default false,
  workout boolean not null default false,
  friends boolean not null default false,
  work boolean not null default false,
  housework boolean not null default false,
  plants boolean not null default false,
  duolingo boolean not null default false,
  daily_spending numeric default 0,
  water_amount numeric default 0,
  user_id uuid default auth.uid(),
  constraint daily_habits_user_date_key unique (user_id, date)
);
alter table public.daily_habits enable row level security;
create policy "Users can view own records" on public.daily_habits for select using ((select auth.uid()) = user_id);
create policy "Users can insert own records" on public.daily_habits for insert with check ((select auth.uid()) = user_id);
create policy "Users can update own records" on public.daily_habits for update using ((select auth.uid()) = user_id);
create policy "Users can delete own records" on public.daily_habits for delete using ((select auth.uid()) = user_id);

create table if not exists public.daily_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  date date not null,
  schema_id text not null,
  created_at timestamptz not null default timezone('utc', now()),
  new_time text,
  is_hidden boolean default false,
  constraint daily_overrides_user_id_date_schema_id_key unique (user_id, date, schema_id)
);
alter table public.daily_overrides enable row level security;
create policy "Użytkownicy mogą widzieć tylko swoje ukryte rutyny" on public.daily_overrides for select using (auth.uid() = user_id);
create policy "Użytkownicy mogą ukrywać własne rutyny" on public.daily_overrides for insert with check (auth.uid() = user_id);
create policy "Użytkownicy mogą usuwać swoje ukryte rutyny" on public.daily_overrides for delete using (auth.uid() = user_id);

create table if not exists public.day_schemas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  days integer[] not null,
  entries jsonb not null,
  created_at timestamptz default now(),
  user_id uuid default auth.uid()
);
alter table public.day_schemas enable row level security;
create policy "Users can view own records" on public.day_schemas for select using ((select auth.uid()) = user_id);
create policy "Users can insert own records" on public.day_schemas for insert with check ((select auth.uid()) = user_id);
create policy "Users can update own records" on public.day_schemas for update using ((select auth.uid()) = user_id);
create policy "Users can delete own records" on public.day_schemas for delete using ((select auth.uid()) = user_id);

create table if not exists public.errors (
  id uuid primary key default gen_random_uuid(),
  context text,
  user_id uuid,
  message text,
  stack text,
  created_at timestamptz default now()
);
alter table public.errors enable row level security;
-- Świadomie zero polityk: klient nigdy nie czyta/zapisuje bezpośrednio,
-- wyłącznie przez Edge Function log-error z kluczem service_role.

create table if not exists public.google_calendar_tokens (
  user_id uuid primary key,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.google_calendar_tokens enable row level security;
create policy "Users manage own tokens" on public.google_calendar_tokens for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own Google tokens" on public.google_calendar_tokens for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category text not null,
  category_other text,
  category_code text not null,
  sequence_number integer not null,
  sequence_year integer not null,
  signature text not null,
  issue_date date not null default current_date,
  response_date date,
  recipient text not null,
  description text not null default '',
  license_plate_number text,
  incident_date date,
  incident_place text,
  letter_file_path text,
  response_file_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint letters_unique_signature_slot unique (user_id, sequence_year, sequence_number)
);
alter table public.letters enable row level security;
create policy "letters_select_own" on public.letters for select using (auth.uid() = user_id);
create policy "letters_insert_own" on public.letters for insert with check (auth.uid() = user_id);
create policy "letters_update_own" on public.letters for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "letters_delete_own" on public.letters for delete using (auth.uid() = user_id);

create table if not exists public.meeting_polls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  description text,
  slot_duration_minutes integer not null default 30,
  time_start time not null,
  time_end time not null,
  share_token text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.meeting_polls enable row level security;
create policy "meeting_polls_select_own" on public.meeting_polls for select using (auth.uid() = user_id);
create policy "meeting_polls_insert_own" on public.meeting_polls for insert with check (auth.uid() = user_id);
create policy "meeting_polls_update_own" on public.meeting_polls for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "meeting_polls_delete_own" on public.meeting_polls for delete using (auth.uid() = user_id);

create table if not exists public.mood_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  date date not null,
  mood_id text,
  constraint mood_entries_user_id_date_key unique (user_id, date)
);
alter table public.mood_entries enable row level security;
create policy "Users can manage their own mood entries" on public.mood_entries for all using (auth.uid() = user_id);

create table if not exists public.movies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  genre text,
  rating numeric(3,1),
  platform text,
  description text,
  watched boolean default false,
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  user_id uuid default auth.uid()
);
alter table public.movies enable row level security;
create policy "Users can view own records" on public.movies for select using ((select auth.uid()) = user_id);
create policy "Users can insert own records" on public.movies for insert with check ((select auth.uid()) = user_id);
create policy "Users can update own records" on public.movies for update using ((select auth.uid()) = user_id);
create policy "Users can delete own records" on public.movies for delete using ((select auth.uid()) = user_id);

create table if not exists public.notes (
  id integer generated by default as identity primary key,
  title text not null,
  items text[] not null default '{}',
  bg_color text,
  pinned boolean,
  archived boolean,
  updated_at timestamptz,
  user_id uuid default auth.uid()
);
alter table public.notes enable row level security;
create policy "Users can view own records" on public.notes for select using ((select auth.uid()) = user_id);
create policy "Users can insert own records" on public.notes for insert with check ((select auth.uid()) = user_id);
create policy "Users can update own records" on public.notes for update using ((select auth.uid()) = user_id);
create policy "Users can delete own records" on public.notes for delete using ((select auth.uid()) = user_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  title text not null,
  message text,
  data jsonb default '{}',
  is_read boolean default false,
  created_at timestamptz not null default timezone('utc', now())
);
alter table public.notifications enable row level security;
create policy "Users can view their own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users can update their own notifications" on public.notifications for update using (auth.uid() = user_id);
create policy "Users can delete their own notifications" on public.notifications for delete using (auth.uid() = user_id);
-- Świadomie brak polityki INSERT: notyfikacje piszą wyłącznie Edge Functions kluczem service_role.

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  first_name text not null,
  last_name text,
  relationship text,
  priority integer default 0,
  birthday date,
  phones text[] default '{}',
  emails text[] default '{}',
  notes text,
  last_contact_date timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  nameday date
);
alter table public.people enable row level security;
create policy "Users can view their own people" on public.people for select using (auth.uid() = user_id);
create policy "Users can insert their own people" on public.people for insert with check (auth.uid() = user_id);
create policy "Users can update their own people" on public.people for update using (auth.uid() = user_id);
create policy "Users can delete their own people" on public.people for delete using (auth.uid() = user_id);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  lat numeric not null,
  lng numeric not null,
  tags text[] default '{}',
  phone_number text,
  website text,
  rating numeric,
  notes text,
  google_place_id text,
  opening_hours jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  user_id uuid default auth.uid()
);
alter table public.places enable row level security;
create policy "Manage own places" on public.places for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can view own records" on public.places for select using ((select auth.uid()) = user_id);
create policy "Users can update own records" on public.places for update using ((select auth.uid()) = user_id);
create policy "Users can delete own records" on public.places for delete using ((select auth.uid()) = user_id);
create policy "Users can insert own records" on public.places for insert with check ((select auth.uid()) = user_id);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  user_id uuid default auth.uid()
);
alter table public.products enable row level security;
create policy "Users can view own records" on public.products for select using ((select auth.uid()) = user_id);
create policy "Users can insert own records" on public.products for insert with check ((select auth.uid()) = user_id);
create policy "Users can update own records" on public.products for update using ((select auth.uid()) = user_id);
create policy "Users can delete own records" on public.products for delete using ((select auth.uid()) = user_id);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz default now(),
  last_used timestamptz default now(),
  user_id uuid default auth.uid()
);
alter table public.push_subscriptions enable row level security;
create policy "Users can view own records" on public.push_subscriptions for select using ((select auth.uid()) = user_id);
create policy "Users can insert own records" on public.push_subscriptions for insert with check ((select auth.uid()) = user_id);
create policy "Users can update own records" on public.push_subscriptions for update using ((select auth.uid()) = user_id);
create policy "Users can delete own records" on public.push_subscriptions for delete using ((select auth.uid()) = user_id);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category public.recipe_category not null,
  products text[] not null default '{}',
  description text,
  created_at timestamptz not null default now(),
  user_id uuid default auth.uid()
);
alter table public.recipes enable row level security;
create policy "Users can view own records" on public.recipes for select using ((select auth.uid()) = user_id);
create policy "Users can insert own records" on public.recipes for insert with check ((select auth.uid()) = user_id);
create policy "Users can update own records" on public.recipes for update using ((select auth.uid()) = user_id);
create policy "Users can delete own records" on public.recipes for delete using ((select auth.uid()) = user_id);

create sequence if not exists public.notifications_id_seq;

create table if not exists public.reminders (
  id integer not null default nextval('public.notifications_id_seq'),
  tytul text,
  data_poczatkowa date,
  powtarzanie integer,
  done text,
  user_id uuid default auth.uid(),
  primary key (id)
);
alter sequence public.notifications_id_seq owned by public.reminders.id;
alter table public.reminders enable row level security;
create policy "Users can view own records" on public.reminders for select using ((select auth.uid()) = user_id);
create policy "Users can insert own records" on public.reminders for insert with check ((select auth.uid()) = user_id);
create policy "Users can update own records" on public.reminders for update using ((select auth.uid()) = user_id);
create policy "Users can delete own records" on public.reminders for delete using ((select auth.uid()) = user_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  date date not null,
  agenda text[] default '{}',
  participants text[] default '{}',
  tasks jsonb default '[]',
  notes text,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now(),
  user_id uuid default auth.uid()
);
alter table public.reports enable row level security;
create policy "Users can view own records" on public.reports for select using ((select auth.uid()) = user_id);
create policy "Users can insert own records" on public.reports for insert with check ((select auth.uid()) = user_id);
create policy "Users can update own records" on public.reports for update using ((select auth.uid()) = user_id);
create policy "Users can delete own records" on public.reports for delete using ((select auth.uid()) = user_id);

create table if not exists public.settings (
  user_id uuid primary key default auth.uid(),
  sort_order text not null default 'priority',
  show_completed boolean not null default true,
  show_habits boolean not null default true,
  show_water_tracker boolean not null default true,
  show_budget_items boolean,
  users text[],
  show_month_view boolean,
  show_notifications boolean,
  theme text default 'auto',
  favorite_stops jsonb default '[]',
  notif_morning_brief boolean default true,
  notif_tasks boolean default true,
  notif_events boolean default true,
  notif_water boolean default true,
  notif_habits boolean default true,
  notif_evening boolean default true,
  habit_pills boolean default true,
  habit_bath boolean default true,
  habit_workout boolean default true,
  habit_friends boolean default true,
  habit_work boolean default true,
  habit_housework boolean default true,
  habit_plants boolean default true,
  habit_duolingo boolean default true,
  sort_notes text default 'updated_desc',
  sort_shopping text default 'updated_desc',
  sort_movies text default 'updated_desc',
  sort_recipes text default 'category',
  sort_places text default 'alphabetical',
  show_mood_tracker boolean default true,
  mood_options jsonb,
  main_view text default 'calendar',
  hide_priority_5 boolean not null default false,
  sort_people text,
  notif_birthdays boolean default true,
  notif_contact boolean not null default true,
  sort_bills text
);
alter table public.settings enable row level security;
create policy "Users can view own records" on public.settings for select using ((select auth.uid()) = user_id);
create policy "Users can insert own records" on public.settings for insert with check ((select auth.uid()) = user_id);
create policy "Users can update own records" on public.settings for update using ((select auth.uid()) = user_id);
create policy "Users can delete own records" on public.settings for delete using ((select auth.uid()) = user_id);

create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  elements jsonb not null default '[]',
  inserted_at timestamptz default now(),
  updated_at timestamptz default now(),
  user_id uuid default auth.uid(),
  shared_with_id uuid
);
alter table public.shopping_lists enable row level security;
create policy "Users can view shopping_lists" on public.shopping_lists for select using (((select auth.uid()) = user_id) or ((select auth.uid()) = shared_with_id));
create policy "Users can insert shopping_lists" on public.shopping_lists for insert with check ((select auth.uid()) = user_id);
create policy "Users can delete shopping_lists" on public.shopping_lists for delete using (((select auth.uid()) = user_id) or ((select auth.uid()) = shared_with_id));
create policy "Users can update shopping_lists" on public.shopping_lists for update
  using (((select auth.uid()) = user_id) or ((select auth.uid()) = shared_with_id));
create policy "Enable update for users based on user_id or shared_with_id" on public.shopping_lists for update
  using ((auth.uid() = user_id) or (auth.uid() = shared_with_id))
  with check ((auth.uid() = user_id) or (auth.uid() = shared_with_id) or (shared_with_id = user_id) or (shared_with_id is null));

create table if not exists public.stops (
  stop_id text primary key,
  stop_code text,
  stop_name text not null,
  stop_lat double precision not null,
  stop_lon double precision not null,
  zone_id text,
  geom geometry
);
alter table public.stops enable row level security;
create policy "Wszyscy mogą czytać przystanki" on public.stops for select using (true);

create table if not exists public.streaks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  icon text default 'flame',
  created_at timestamptz default now(),
  user_id uuid default auth.uid()
);
alter table public.streaks enable row level security;
create policy "Users can view own records" on public.streaks for select using ((select auth.uid()) = user_id);
create policy "Users can insert own records" on public.streaks for insert with check ((select auth.uid()) = user_id);
create policy "Users can update own records" on public.streaks for update using ((select auth.uid()) = user_id);
create policy "Users can delete own records" on public.streaks for delete using ((select auth.uid()) = user_id);

create table if not exists public.tasks (
  id integer generated by default as identity primary key,
  title text not null,
  description text,
  due_date date,
  category text,
  priority numeric(2,0),  status text,
  scheduled_time timestamp,
  user_id uuid default auth.uid(),
  for_user_id uuid
);
alter table public.tasks enable row level security;
create policy "Users can view tasks" on public.tasks for select using (((select auth.uid()) = user_id) or ((select auth.uid()) = for_user_id));
create policy "Users can insert tasks" on public.tasks for insert with check ((select auth.uid()) = user_id);
create policy "Users can update tasks" on public.tasks for update using (((select auth.uid()) = user_id) or ((select auth.uid()) = for_user_id));
create policy "Users can delete tasks" on public.tasks for delete using (((select auth.uid()) = user_id) or ((select auth.uid()) = for_user_id));

create table if not exists public.user_trains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  train_number text not null,
  date date not null,
  departure_time text not null,
  from_station text,
  to_station text,
  wagon text,
  seat text,
  created_at timestamptz not null default now(),
  train_name text
);
alter table public.user_trains enable row level security;
create policy "Użytkownicy mogą przeglądać tylko swoje pociągi" on public.user_trains for select using (auth.uid() = user_id);
create policy "Użytkownicy mogą dodawać tylko swoje pociągi" on public.user_trains for insert with check (auth.uid() = user_id);
create policy "Użytkownicy mogą usuwać tylko swoje pociągi" on public.user_trains for delete using (auth.uid() = user_id);

create table if not exists public.users (
  id uuid primary key,
  email text,
  updated_at timestamptz
);
alter table public.users enable row level security;
create policy "Users can view all users" on public.users for select using (true);
create policy "Users can update their own profile" on public.users for update using (auth.uid() = id);

create table if not exists public.vcard_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  profile_name text not null,
  full_name text,
  avatar_url text,
  organization text,
  phones jsonb default '[]',
  emails jsonb default '[]',
  addresses jsonb default '[]',
  social_links jsonb default '{}',
  business_data jsonb default '{}',
  is_public boolean default false,
  public_slug text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  color_light text default '#ffffff',
  color_dark text default '#171717'
);
alter table public.vcard_profiles enable row level security;
create policy "Users can view own or public profiles" on public.vcard_profiles for select using ((auth.uid() = user_id) or (is_public = true));
create policy "Public profiles are viewable by everyone." on public.vcard_profiles for select using (is_public = true);
create policy "Users can insert own profiles" on public.vcard_profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own profiles" on public.vcard_profiles for update using (auth.uid() = user_id);
create policy "Users can delete own profiles" on public.vcard_profiles for delete using (auth.uid() = user_id);

create table if not exists public.work_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  description text not null,
  start_time timestamptz not null,
  end_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.work_logs enable row level security;
create policy "work_logs_select_own" on public.work_logs for select using (auth.uid() = user_id);
create policy "work_logs_insert_own" on public.work_logs for insert with check (auth.uid() = user_id);
create policy "work_logs_update_own" on public.work_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "work_logs_delete_own" on public.work_logs for delete using (auth.uid() = user_id);
create policy "Users can view their own work logs" on public.work_logs for select using (auth.uid() = user_id);
create policy "Users can insert their own work logs" on public.work_logs for insert with check (auth.uid() = user_id);
create policy "Users can update their own work logs" on public.work_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own work logs" on public.work_logs for delete using (auth.uid() = user_id);

-- ============================================================
-- Tabele zależne (mają klucze obce do tabel utworzonych powyżej)
-- ============================================================

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  amount double precision not null,
  date date not null,
  description text,
  is_income boolean not null default false,
  done boolean,
  user_id uuid default auth.uid(),
  category_id uuid references public.budget_categories(id) on delete set null,
  is_recurring boolean not null default false,
  recurring_until date,
  parent_bill_id uuid references public.bills(id) on delete cascade
);
alter table public.bills enable row level security;
create policy "Users can view own records" on public.bills for select using ((select auth.uid()) = user_id);
create policy "Users can insert own records" on public.bills for insert with check ((select auth.uid()) = user_id);
create policy "Users can update own records" on public.bills for update using ((select auth.uid()) = user_id);
create policy "Users can delete own records" on public.bills for delete using ((select auth.uid()) = user_id);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  place text,
  repeat text default 'none',
  created_at timestamptz default now(),
  user_id uuid default auth.uid(),
  shared_with_id uuid,
  google_event_id text,
  calendar_id uuid references public.connected_calendars(id) on delete cascade
);
alter table public.events enable row level security;
create policy "events_select_own_or_shared" on public.events for select using ((auth.uid() = user_id) or (auth.uid() = shared_with_id));
create policy "Users can view events" on public.events for select
  using ((((select auth.uid()) = user_id) or ((select auth.uid()) = shared_with_id)));
create policy "events_insert_own" on public.events for insert with check ((select auth.uid()) = user_id);
create policy "Users can insert events" on public.events for insert with check (((select auth.uid()) = user_id));
create policy "events_update_own" on public.events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can update events" on public.events for update
  using ((((select auth.uid()) = user_id) or ((select auth.uid()) = shared_with_id)));
create policy "events_delete_own" on public.events for delete using (auth.uid() = user_id);
create policy "Users can delete events" on public.events for delete
  using ((((select auth.uid()) = user_id) or ((select auth.uid()) = shared_with_id)));

create table if not exists public.meeting_poll_dates (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.meeting_polls(id) on delete cascade,
  date date not null,
  constraint meeting_poll_dates_poll_id_date_key unique (poll_id, date)
);
alter table public.meeting_poll_dates enable row level security;
create policy "meeting_poll_dates_select_own" on public.meeting_poll_dates for select
  using (exists (select 1 from public.meeting_polls p where p.id = meeting_poll_dates.poll_id and p.user_id = auth.uid()));
create policy "meeting_poll_dates_insert_own" on public.meeting_poll_dates for insert
  with check (exists (select 1 from public.meeting_polls p where p.id = meeting_poll_dates.poll_id and p.user_id = auth.uid()));
create policy "meeting_poll_dates_delete_own" on public.meeting_poll_dates for delete
  using (exists (select 1 from public.meeting_polls p where p.id = meeting_poll_dates.poll_id and p.user_id = auth.uid()));

create table if not exists public.meeting_poll_responses (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.meeting_polls(id) on delete cascade,
  respondent_name text not null,
  respondent_email text,
  user_id uuid,
  edit_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.meeting_poll_responses enable row level security;
create policy "meeting_poll_responses_select_own" on public.meeting_poll_responses for select
  using (exists (select 1 from public.meeting_polls p where p.id = meeting_poll_responses.poll_id and p.user_id = auth.uid()));

create table if not exists public.meeting_poll_availabilities (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.meeting_poll_responses(id) on delete cascade,
  date date not null,
  start_time time not null,
  constraint meeting_poll_availabilities_response_id_date_start_time_key unique (response_id, date, start_time)
);
alter table public.meeting_poll_availabilities enable row level security;
create policy "meeting_poll_availabilities_select_own" on public.meeting_poll_availabilities for select
  using (exists (
    select 1 from public.meeting_poll_responses r
    join public.meeting_polls p on p.id = r.poll_id
    where r.id = meeting_poll_availabilities.response_id and p.user_id = auth.uid()
  ));
