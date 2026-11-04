#!/usr/bin/env bash
# supabase/tests/poll_signups_concurrency.sh
#
# Test współbieżności book_meeting_poll_slots na prawdziwym PostgreSQL: wiele równoległych sesji zapisuje się na
# slot z ograniczoną liczbą miejsc. Dokładnie `capacity` zapisów musi się udać, reszta dostaje „full”.
# Użycie: PGDATABASE=baza_testowa ./supabase/tests/poll_signups_concurrency.sh   (psql musi mieć dostęp do bazy)
set -euo pipefail
CAPACITY=3
SESSIONS=20
psql -q -v ON_ERROR_STOP=1 <<SQL
drop table if exists public.meeting_poll_bookings cascade;
drop table if exists public.meeting_polls cascade;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as \$\$ select null::uuid \$\$;
do \$\$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end \$\$;
create table public.meeting_polls (id uuid primary key default gen_random_uuid(), user_id uuid not null default gen_random_uuid(),
  title text not null default 't', status text not null default 'open', closes_at timestamptz);
SQL
psql -q -v ON_ERROR_STOP=1 -f "$(dirname "$0")/../sql/2026-11-05_poll_signups.sql" >/dev/null
POLL=$(psql -qAt -c "insert into public.meeting_polls (title) values ('wspolbieznosc') returning id" | head -1)
psql -q -c "update public.meeting_polls set mode='signup', slot_capacity=$CAPACITY, max_slots_per_person=1 where id='$POLL'"
OUT=$(mktemp -d)
for i in $(seq 1 $SESSIONS); do
  psql -qAt -c "select public.book_meeting_poll_slots('$POLL','Osoba $i',null,'[{\"date\":\"2026-12-01\",\"start_time\":\"10:00\"}]','v1')" > "$OUT/$i.json" &
done
wait
OK=$(cat "$OUT"/*.json | grep -c '"ok": true' || true)
FULL=$(cat "$OUT"/*.json | grep -c '"error": "full"' || true)
ROWS=$(psql -qAt -c "select count(*) from public.meeting_poll_bookings where poll_id='$POLL'")
echo "sesje=$SESSIONS pojemnosc=$CAPACITY udane=$OK pelne=$FULL wierszy=$ROWS"
[ "$OK" -eq "$CAPACITY" ] && [ "$FULL" -eq $((SESSIONS - CAPACITY)) ] && [ "$ROWS" -eq "$CAPACITY" ] || { echo "BŁĄD: naruszony limit miejsc"; exit 1; }
echo "OK: limit miejsc zachowany przy współbieżnych zapisach"
