-- supabase/migrations/20260730000000_schema_cleanup_and_fixes.sql
--
-- Poprawki po przeglądzie schematu wyciągniętego z produkcji. Zakłada, że
-- ta migracja jest stosowana PO wygenerowanej przez `supabase db pull`
-- migracji bazowej (odzwierciedlającej aktualny stan produkcji).
--
-- Zakres celowo ograniczony do zmian bezpiecznych i niewymagających
-- koordynacji ze zmianami w kodzie aplikacji. Zmiany, które wymagałyby
-- takiej koordynacji (patrz wiadomość w czacie), są tu pominięte celowo.

begin;

-- 1) daily_habits nie ma żadnego klucza głównego (tylko unique na
--    user_id+date) - dodajemy właściwy PK.
alter table public.daily_habits
  add column if not exists id uuid not null default gen_random_uuid();

alter table public.daily_habits
  add constraint daily_habits_pkey primary key (id);

-- 2) connected_calendars ma dwa identyczne ograniczenia unique na tych
--    samych kolumnach - usuwamy zbędne.
alter table public.connected_calendars
  drop constraint if exists connected_calendars_user_calendar_unique;

-- 3) Duplikaty polityk RLS - każda z poniższych tabel ma po 2 polityki
--    na tę samą komendę z tą samą (albo szerszą/węższą) logiką,
--    pozostałe po kolejnych przebudowach bez sprzątania starych wersji.
--    Konsolidujemy do jednej, zachowując dotychczasowe efektywne
--    uprawnienia (nigdzie nie zawężamy dostępu).

-- connected_calendars: zostają *_own polityki, usuwamy starsze duplikaty.
drop policy if exists "Users can delete own connected calendars" on public.connected_calendars;
drop policy if exists "Users can view own connected calendars" on public.connected_calendars;
drop policy if exists "Users can update own connected calendars" on public.connected_calendars;
drop policy if exists "Users can insert own connected calendars" on public.connected_calendars;

-- events: SELECT/INSERT miały identyczne duplikaty - usuwamy starsze.
-- UPDATE/DELETE miały dwie NIERÓWNE polityki (jedna "tylko właściciel",
-- druga "właściciel lub shared_with_id") - scalamy w jedną, zachowując
-- SZERSZĄ (obecnie efektywną) regułę, żeby nie zawężać dostępu.
drop policy if exists "Users can view events" on public.events;
drop policy if exists "Users can insert events" on public.events;

drop policy if exists "Users can update events" on public.events;
drop policy if exists "events_update_own" on public.events;
create policy "events_update_own_or_shared" on public.events
  for update
  using (auth.uid() = user_id or auth.uid() = shared_with_id)
  with check (auth.uid() = user_id or auth.uid() = shared_with_id);

drop policy if exists "Users can delete events" on public.events;
drop policy if exists "events_delete_own" on public.events;
create policy "events_delete_own_or_shared" on public.events
  for delete
  using (auth.uid() = user_id or auth.uid() = shared_with_id);

-- places: jedna polityka "ALL" już pokrywa wszystkie 4 pozostałe.
drop policy if exists "Users can view own records" on public.places;
drop policy if exists "Users can update own records" on public.places;
drop policy if exists "Users can delete own records" on public.places;
drop policy if exists "Users can insert own records" on public.places;

-- shopping_lists: dwie nakładające się polityki UPDATE - scalamy w jedną,
-- zachowując pełną dotychczasową permisywność (łącznie z dopuszczeniem
-- ustawienia shared_with_id na NULL, czyli "odudostępnienia" listy).
drop policy if exists "Users can update shopping_lists" on public.shopping_lists;
drop policy if exists "Enable update for users based on user_id or shared_with_id" on public.shopping_lists;
create policy "shopping_lists_update_own_or_shared" on public.shopping_lists
  for update
  using (auth.uid() = user_id or auth.uid() = shared_with_id)
  with check (
    auth.uid() = user_id
    or auth.uid() = shared_with_id
    or shared_with_id = user_id
    or shared_with_id is null
  );

-- vcard_profiles: węższa polityka SELECT jest całkowicie pokryta przez
-- szerszą ("własny profil LUB publiczny").
drop policy if exists "Public profiles are viewable by everyone." on public.vcard_profiles;

-- work_logs: cztery pary identycznych duplikatów (jedna para na komendę).
drop policy if exists "Users can delete their own work logs" on public.work_logs;
drop policy if exists "Users can insert their own work logs" on public.work_logs;
drop policy if exists "Users can view their own work logs" on public.work_logs;
drop policy if exists "Users can update their own work logs" on public.work_logs;

-- 4) reminders.id korzysta z sekwencji `notifications_id_seq` - myląca
--    nazwa (sugeruje przynależność do tabeli notifications, która i tak
--    używa uuid, nie tej sekwencji). Porządkujemy nazwę i właściciela.
alter sequence if exists public.notifications_id_seq rename to reminders_id_seq;
alter sequence if exists public.reminders_id_seq owned by public.reminders.id;

-- 5) reminders.done trzyma datę jako text ("YYYY-MM-DD") zamiast date.
--    PostgREST serializuje kolumnę date jako identyczny string, więc kod
--    aplikacji porównujący go z "YYYY-MM-DD" nie wymaga zmian.
alter table public.reminders
  alter column done type date using (nullif(done, '')::date);

-- 6) tasks.priority jako numeric(2,0) dla wartości całkowitych 1-5 -
--    właściwym typem jest smallint.
alter table public.tasks
  alter column priority type smallint using (priority::smallint);

commit;
