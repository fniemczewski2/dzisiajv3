-- Sen: odcinki są unikalne po czasie, nie po dobie. Skrót mógł wysłać ten sam odcinek z różnymi datami (np. dwie noce
-- jednym wysłaniem), co dawało duplikaty i zlewanie snów. Sny są teraz wyznaczane z czasu odcinków (przerwa >= 3 h).
-- Uruchom PO 2026-11-03_health_tab.sql.

-- Duplikaty: zostaje najświeższy zapis każdego odcinka (ten sam użytkownik, początek i faza).
delete from public.health_sleep_segments a
  using public.health_sleep_segments b
 where a.user_id = b.user_id
   and a.started_at = b.started_at
   and a.stage = b.stage
   and (a.synced_at < b.synced_at or (a.synced_at = b.synced_at and a.id > b.id));

alter table public.health_sleep_segments
  drop constraint if exists health_sleep_segments_user_id_date_started_at_stage_key;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'health_sleep_segments_user_started_stage_key') then
    alter table public.health_sleep_segments
      add constraint health_sleep_segments_user_started_stage_key unique (user_id, started_at, stage);
  end if;
end $$;

create index if not exists health_sleep_segments_user_started_idx on public.health_sleep_segments (user_id, started_at);
