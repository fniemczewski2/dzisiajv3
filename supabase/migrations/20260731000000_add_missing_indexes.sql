-- supabase/migrations/20260731000000_add_missing_indexes.sql
begin;

-- Indeksy pod filtry z hooks/db/* — kolejność kolumn zgodna z kolejnością
-- warunków w zapytaniach (user_id jest zawsze pierwszy).
create index concurrently if not exists tasks_user_due_idx
  on public.tasks (user_id, due_date);
create index concurrently if not exists tasks_for_user_idx
  on public.tasks (for_user_id) where for_user_id is not null;

create index concurrently if not exists events_user_start_idx
  on public.events (user_id, start_time);
create index concurrently if not exists events_shared_with_idx
  on public.events (shared_with_id) where shared_with_id is not null;

create index concurrently if not exists bills_user_date_idx      on public.bills (user_id, date);
create index concurrently if not exists work_logs_user_start_idx on public.work_logs (user_id, start_time desc);
create index concurrently if not exists daily_habits_user_date_idx on public.daily_habits (user_id, date);
create index concurrently if not exists mood_entries_user_date_idx on public.mood_entries (user_id, date);
create index concurrently if not exists notifications_user_read_idx
  on public.notifications (user_id, is_read) where is_read = false;
create index concurrently if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
create index concurrently if not exists places_user_idx            on public.places (user_id);
create index concurrently if not exists connected_calendars_user_idx on public.connected_calendars (user_id);
create index concurrently if not exists meeting_polls_share_token_idx on public.meeting_polls (share_token);

commit;

begin;

drop policy if exists "Users can view all users" on public.users;
create policy "users_select_own" on public.users
  for select to authenticated
  using (auth.uid() = id);

create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.users
  where lower(email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.find_user_id_by_email(text) from public, anon;
grant execute on function public.find_user_id_by_email(text) to authenticated;

commit;