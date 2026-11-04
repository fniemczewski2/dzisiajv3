-- 2026-11-05_poll_signups.sql
--
-- Ankiety w trybie zapisów: terminy z ograniczoną liczbą miejsc (pojemność slotu) i limitem terminów na osobę.
-- Zapis robi funkcja book_meeting_poll_slots: blokuje wiersz ankiety (FOR UPDATE), więc równoczesne zapisy na ostatnie
-- miejsce są serializowane – dokładnie jedna osoba je dostaje. Funkcję wywołuje wyłącznie serwer (service_role)
-- po walidacji siatki terminów, limitów i ochrony przed nadużyciami (pages/api/meeting-polls/public/[token]/book.ts).
-- Uruchom raz w SQL Editorze Supabase. Test: supabase/tests/poll_signups.sql.

alter table public.meeting_polls
  add column if not exists mode text not null default 'availability',
  add column if not exists slot_capacity integer not null default 1,
  add column if not exists max_slots_per_person integer not null default 1;

alter table public.meeting_polls drop constraint if exists meeting_polls_mode_check;
alter table public.meeting_polls add constraint meeting_polls_mode_check check (mode in ('availability', 'signup'));
alter table public.meeting_polls drop constraint if exists meeting_polls_slot_capacity_check;
alter table public.meeting_polls add constraint meeting_polls_slot_capacity_check check (slot_capacity between 1 and 500);
alter table public.meeting_polls drop constraint if exists meeting_polls_max_slots_per_person_check;
alter table public.meeting_polls
  add constraint meeting_polls_max_slots_per_person_check check (max_slots_per_person between 1 and 50);

create table if not exists public.meeting_poll_bookings (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.meeting_polls (id) on delete cascade,
  date date not null,
  start_time time without time zone not null,
  -- Klucz osoby: adres e-mail (małe litery), a bez niego imię (małe litery). Pilnuje jednego zapisu osoby na slot.
  person_key text not null check (length(person_key) between 1 and 320),
  name text not null check (length(btrim(name)) between 1 and 100),
  email text check (email is null or length(email) <= 320),
  consent_at timestamptz not null default now(),
  consent_version text not null check (length(consent_version) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (poll_id, date, start_time, person_key)
);

create index if not exists meeting_poll_bookings_slot_idx on public.meeting_poll_bookings (poll_id, date, start_time);

alter table public.meeting_poll_bookings enable row level security;

-- Organizator widzi i usuwa zapisy w swoich ankietach; wstawianie tylko przez funkcję (serwer).
drop policy if exists meeting_poll_bookings_select_own on public.meeting_poll_bookings;
create policy meeting_poll_bookings_select_own on public.meeting_poll_bookings
  for select to authenticated
  using (exists (select 1 from public.meeting_polls p where p.id = poll_id and p.user_id = (select auth.uid())));

drop policy if exists meeting_poll_bookings_delete_own on public.meeting_poll_bookings;
create policy meeting_poll_bookings_delete_own on public.meeting_poll_bookings
  for delete to authenticated
  using (exists (select 1 from public.meeting_polls p where p.id = poll_id and p.user_id = (select auth.uid())));

revoke all on table public.meeting_poll_bookings from anon, authenticated;
grant select, delete on table public.meeting_poll_bookings to authenticated;
grant all on table public.meeting_poll_bookings to service_role;

-- Odpowiedź błędu w jednym miejscu: { "ok": false, "error": <kod>, ...dodatkowe pola }.
create or replace function public._meeting_poll_fail(p_code text, p_extra jsonb default '{}'::jsonb)
returns jsonb
language sql
immutable
as $$ select jsonb_build_object('ok', false, 'error', p_code) || p_extra $$;

revoke all on function public._meeting_poll_fail(text, jsonb) from public;

-- Sloty z wejścia jako unikalne pary (data, godzina); klucze JSON występują tylko tutaj.
create or replace function public._meeting_poll_slot_rows(p_slots jsonb)
returns table (d date, t time)
language sql
immutable
as $$ select distinct (x ->> 'date')::date, (x ->> 'start_time')::time from jsonb_array_elements(p_slots) x $$;

-- Slot w odpowiedzi błędu (ten sam kształt co wcześniej: { "date": ..., "start_time": "HH24:MI" }).
create or replace function public._meeting_poll_slot_json(p_date date, p_time time)
returns jsonb
language sql
immutable
as $$ select jsonb_build_object('date', p_date, 'start_time', to_char(p_time, 'HH24:MI')) $$;

revoke all on function public._meeting_poll_slot_rows(jsonb) from public;
revoke all on function public._meeting_poll_slot_json(date, time) from public;

create or replace function public.book_meeting_poll_slots(
  p_poll_id uuid,
  p_name text,
  p_email text,
  p_slots jsonb,
  p_consent_version text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_poll record;
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_key text;
  v_slot record;
  v_requested integer;
  v_existing integer;
  v_taken integer;
begin
  if v_name = '' or length(v_name) > 100 then
    return public._meeting_poll_fail('invalid_name');
  end if;
  if p_slots is null or jsonb_typeof(p_slots) <> 'array' or jsonb_array_length(p_slots) = 0 then
    return public._meeting_poll_fail('no_slots');
  end if;
  if jsonb_array_length(p_slots) > 50 then
    return public._meeting_poll_fail('too_many_slots');
  end if;

  -- Blokada ankiety: zapisy do tej samej ankiety są wykonywane jeden po drugim.
  select id, mode, status, closes_at, slot_capacity, max_slots_per_person
    into v_poll
    from public.meeting_polls
   where id = p_poll_id
   for update;

  if not found then
    return public._meeting_poll_fail('not_found');
  end if;
  if v_poll.mode <> 'signup' then
    return public._meeting_poll_fail('not_signup');
  end if;
  if v_poll.status <> 'open' or (v_poll.closes_at is not null and v_poll.closes_at <= now()) then
    return public._meeting_poll_fail('closed');
  end if;

  v_key := coalesce(v_email, lower(v_name));

  select count(*) into v_requested from public._meeting_poll_slot_rows(p_slots);

  select count(*) into v_existing from public.meeting_poll_bookings where poll_id = p_poll_id and person_key = v_key;
  if v_existing + v_requested > v_poll.max_slots_per_person then
    return public._meeting_poll_fail('limit', jsonb_build_object('max', v_poll.max_slots_per_person, 'existing', v_existing));
  end if;

  for v_slot in
    select r.d, r.t from public._meeting_poll_slot_rows(p_slots) r order by 1, 2
  loop
    if exists (
      select 1 from public.meeting_poll_bookings b
       where b.poll_id = p_poll_id and b.date = v_slot.d and b.start_time = v_slot.t and b.person_key = v_key
    ) then
      return public._meeting_poll_fail('already_booked', jsonb_build_object('slot', public._meeting_poll_slot_json(v_slot.d, v_slot.t)));
    end if;
    select count(*) into v_taken from public.meeting_poll_bookings b
     where b.poll_id = p_poll_id and b.date = v_slot.d and b.start_time = v_slot.t;
    if v_taken >= v_poll.slot_capacity then
      return public._meeting_poll_fail('full', jsonb_build_object('slot', public._meeting_poll_slot_json(v_slot.d, v_slot.t)));
    end if;
  end loop;

  insert into public.meeting_poll_bookings (poll_id, date, start_time, person_key, name, email, consent_version)
    select p_poll_id, r.d, r.t, v_key, v_name, v_email, p_consent_version
      from public._meeting_poll_slot_rows(p_slots) r;

  return jsonb_build_object('ok', true, 'booked', v_requested);
end;
$$;

revoke all on function public.book_meeting_poll_slots(uuid, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.book_meeting_poll_slots(uuid, text, text, jsonb, text) to service_role;
