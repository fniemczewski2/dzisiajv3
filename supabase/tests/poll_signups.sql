-- supabase/tests/poll_signups.sql
--
-- Test funkcji book_meeting_poll_slots na czystym PostgreSQL (psql -v ON_ERROR_STOP=1 -f ...). Tworzy atrapy auth.uid()
-- i tabeli meeting_polls (tylko kolumny użyte przez funkcję), wykonuje migrację 2026-11-05_poll_signups.sql i sprawdza
-- reguły: pojemność, limit na osobę, duplikaty, zamknięcie, tryb, normalizację klucza osoby. Błąd = RAISE EXCEPTION.

\set ON_ERROR_STOP on
begin;

-- Stałe testowe jako funkcje (każda wartość zapisana raz).
create or replace function pg_temp.role_auth() returns text language sql immutable as $$ select 'authenticated'::text $$;
create or replace function pg_temp.sig() returns text language sql immutable
  as $$ select 'public.book_meeting_poll_slots(uuid,text,text,jsonb,text)'::text $$;
create or replace function pg_temp.slot_a() returns jsonb language sql immutable
  as $$ select '[{"date":"2026-12-01","start_time":"10:00"}]'::jsonb $$;
create or replace function pg_temp.slot_b() returns jsonb language sql immutable
  as $$ select '[{"date":"2026-12-05","start_time":"09:00"}]'::jsonb $$;
create or replace function pg_temp.exec_priv() returns text language sql immutable as $$ select 'execute'::text $$;
create or replace function pg_temp.email_anna() returns text language sql immutable as $$ select 'anna@example.com'::text $$;

create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = pg_temp.role_auth()) then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;

create table public.meeting_polls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default gen_random_uuid(),
  title text not null default 't',
  status text not null default 'open',
  closes_at timestamptz
);

\i supabase/sql/2026-11-05_poll_signups.sql

create or replace function pg_temp.expect(label text, actual jsonb, expected jsonb) returns void language plpgsql as $$
begin
  if actual is distinct from expected and not (actual @> expected) then
    raise exception 'TEST % : oczekiwano %, jest %', label, expected, actual;
  end if;
end $$;

do $$
declare
  poll uuid; r jsonb;
begin
  insert into public.meeting_polls (title) values ('zapisy') returning id into poll;

  -- tryb domyślny: nie jest to ankieta zapisów
  r := public.book_meeting_poll_slots(poll, 'Anna', null, pg_temp.slot_a(), 'v1');
  perform pg_temp.expect('tryb dostępności', r, '{"ok":false,"error":"not_signup"}');

  update public.meeting_polls set mode = 'signup', slot_capacity = 2, max_slots_per_person = 2 where id = poll;

  -- poprawny zapis dwóch terminów
  r := public.book_meeting_poll_slots(poll, 'Anna', 'Anna@Example.com ', '[{"date":"2026-12-01","start_time":"10:00"},{"date":"2026-12-01","start_time":"10:30"}]', 'v1');
  perform pg_temp.expect('zapis', r, '{"ok":true,"booked":2}');
  if (select count(*) from public.meeting_poll_bookings where poll_id = poll and person_key = pg_temp.email_anna()) <> 2 then
    raise exception 'TEST klucz osoby: e-mail powinien być zapisany małymi literami';
  end if;

  -- limit na osobę (ten sam e-mail, inna wielkość liter i imię)
  r := public.book_meeting_poll_slots(poll, 'Inna Nazwa', 'ANNA@example.com', '[{"date":"2026-12-02","start_time":"10:00"}]', 'v1');
  perform pg_temp.expect('limit', r, '{"ok":false,"error":"limit","max":2,"existing":2}');

  -- duplikat własnego terminu
  update public.meeting_polls set max_slots_per_person = 5 where id = poll;
  r := public.book_meeting_poll_slots(poll, 'Anna', pg_temp.email_anna(), pg_temp.slot_a(), 'v1');
  perform pg_temp.expect('duplikat', r, '{"ok":false,"error":"already_booked","slot":{"date":"2026-12-01","start_time":"10:00"}}');

  -- pojemność slotu = 2: druga osoba wchodzi, trzecia nie
  r := public.book_meeting_poll_slots(poll, 'Bartek', null, pg_temp.slot_a(), 'v1');
  perform pg_temp.expect('drugie miejsce', r, '{"ok":true,"booked":1}');
  r := public.book_meeting_poll_slots(poll, 'Celina', null, pg_temp.slot_a(), 'v1');
  perform pg_temp.expect('slot pełny', r, '{"ok":false,"error":"full","slot":{"date":"2026-12-01","start_time":"10:00"}}');

  -- operacja jest atomowa: pełny slot na końcu listy nie zostawia wcześniejszych zapisów
  r := public.book_meeting_poll_slots(poll, 'Celina', null, '[{"date":"2026-12-03","start_time":"09:00"},{"date":"2026-12-01","start_time":"10:00"}]', 'v1');
  perform pg_temp.expect('atomowość (odmowa)', r, '{"ok":false,"error":"full"}');
  if exists (select 1 from public.meeting_poll_bookings where poll_id = poll and person_key = 'celina') then
    raise exception 'TEST atomowość: częściowy zapis';
  end if;

  -- powtórzone terminy w jednym żądaniu liczą się raz
  r := public.book_meeting_poll_slots(poll, 'Dorota', null, '[{"date":"2026-12-04","start_time":"09:00"},{"date":"2026-12-04","start_time":"09:00"}]', 'v1');
  perform pg_temp.expect('deduplikacja żądania', r, '{"ok":true,"booked":1}');

  -- walidacje wejścia
  perform pg_temp.expect('pusta lista', public.book_meeting_poll_slots(poll, 'X', null, '[]', 'v1'), '{"ok":false,"error":"no_slots"}');
  perform pg_temp.expect('puste imię', public.book_meeting_poll_slots(poll, '  ', null, pg_temp.slot_b(), 'v1'), '{"ok":false,"error":"invalid_name"}');
  perform pg_temp.expect('nie tablica', public.book_meeting_poll_slots(poll, 'X', null, '{"a":1}', 'v1'), '{"ok":false,"error":"no_slots"}');
  perform pg_temp.expect('brak ankiety', public.book_meeting_poll_slots(gen_random_uuid(), 'X', null, pg_temp.slot_b(), 'v1'), '{"ok":false,"error":"not_found"}');

  -- zamknięta ankieta i minięty termin zamknięcia
  update public.meeting_polls set status = 'closed' where id = poll;
  perform pg_temp.expect('zamknięta', public.book_meeting_poll_slots(poll, 'Ewa', null, pg_temp.slot_b(), 'v1'), '{"ok":false,"error":"closed"}');
  update public.meeting_polls set status = 'open', closes_at = now() - interval '1 minute' where id = poll;
  perform pg_temp.expect('po terminie', public.book_meeting_poll_slots(poll, 'Ewa', null, pg_temp.slot_b(), 'v1'), '{"ok":false,"error":"closed"}');

  -- ograniczenia tabeli: ten sam klucz osoby na ten sam slot nie wejdzie bezpośrednim INSERT-em
  begin
    insert into public.meeting_poll_bookings (poll_id, date, start_time, person_key, name, consent_version)
      values (poll, '2026-12-01', '10:00', pg_temp.email_anna(), 'Anna', 'v1');
    raise exception 'TEST unikalność: powinien być błąd';
  exception when unique_violation then null; end;

  -- usunięcie ankiety kasuje zapisy (kaskada)
  delete from public.meeting_polls where id = poll;
  if exists (select 1 from public.meeting_poll_bookings where poll_id = poll) then
    raise exception 'TEST kaskada: zapisy powinny zniknąć wraz z ankietą';
  end if;
end $$;

-- uprawnienia: anon i authenticated nie wywołają funkcji, service_role tak
do $$ begin
  if has_function_privilege('anon', pg_temp.sig(), pg_temp.exec_priv())
     or has_function_privilege(pg_temp.role_auth(), pg_temp.sig(), pg_temp.exec_priv()) then
    raise exception 'TEST uprawnienia: funkcja nie może być wywoływalna przez anon/authenticated';
  end if;
  if not has_function_privilege('service_role', pg_temp.sig(), pg_temp.exec_priv()) then
    raise exception 'TEST uprawnienia: service_role musi móc wywołać funkcję';
  end if;
  if has_table_privilege(pg_temp.role_auth(), 'public.meeting_poll_bookings', 'insert')
     or has_table_privilege('anon', 'public.meeting_poll_bookings', 'select') then
    raise exception 'TEST uprawnienia tabeli';
  end if;
end $$;

select 'OK: wszystkie testy poll_signups przeszły' as wynik;
rollback;
