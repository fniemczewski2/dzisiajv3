-- Włączniki briefingu dnia: każdą kartę (poranną i wieczorną) można wyłączyć niezależnie.
-- Domyślnie włączone, czyli zachowanie sprzed zmiany. Skrypt idempotentny.

begin;

alter table public.settings
  add column if not exists brief_morning_enabled boolean not null default true,
  add column if not exists brief_evening_enabled boolean not null default true;

commit;
