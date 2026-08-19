-- Track calendar OAuth sync failures so a revoked/expired refresh token is
-- surfaced to the user instead of silently skipping sync-calendars.ts forever.
alter table public.connected_calendars
  add column if not exists sync_error text;
