-- 2026-11-19_product_prices.sql
--
-- Katalog cen produktów (Ustawienia → Ceny produktów) i dane pomocnicze importu paragonów.
-- Katalog trzyma średnią cenę za jednostkę (zł, po rabatach) i liczbę wystąpień; pojedyncze paragony ani ich pliki
-- nie są zapisywane. Uruchom raz w SQL Editorze Supabase.
--
--   product_prices    jeden wiersz na produkt użytkownika (średnia ważona liczbą wystąpień)
--   receipt_aliases   zapamiętane dopasowanie nazwy z paragonu (Lidl, Biedronka) do produktu z katalogu
--   imported_receipts jednokierunkowy skrót SHA-256 paragonu, tylko do blokowania ponownego importu tego samego paragonu

create table if not exists public.product_prices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  -- Klucz porównania nazwy: małe litery, bez polskich znaków (liczy aplikacja: lib/prices/text.ts, nameKey).
  name_key text not null check (length(name_key) between 1 and 80),
  unit text check (unit is null or unit in ('kg', 'litr', 'szt.', 'opak.', 'm')),
  avg_price numeric(12, 4) not null check (avg_price >= 0 and avg_price < 100000),
  occurrences integer not null default 1 check (occurrences between 1 and 1000000),
  updated_at timestamptz not null default now(),
  unique (user_id, name_key)
);

create table if not exists public.receipt_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  store text not null check (store in ('lidl', 'biedronka')),
  alias_key text not null check (length(alias_key) between 1 and 200),
  product_name_key text not null check (length(product_name_key) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (user_id, store, alias_key)
);

create table if not exists public.imported_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
  imported_at timestamptz not null default now(),
  unique (user_id, fingerprint)
);

alter table public.product_prices enable row level security;
alter table public.receipt_aliases enable row level security;
alter table public.imported_receipts enable row level security;

drop policy if exists product_prices_own on public.product_prices;
create policy product_prices_own on public.product_prices
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists receipt_aliases_own on public.receipt_aliases;
create policy receipt_aliases_own on public.receipt_aliases
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists imported_receipts_own on public.imported_receipts;
create policy imported_receipts_own on public.imported_receipts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.product_prices, public.receipt_aliases, public.imported_receipts from anon;
grant select, insert, update, delete on public.product_prices, public.receipt_aliases, public.imported_receipts to authenticated;
grant all on public.product_prices, public.receipt_aliases, public.imported_receipts to service_role;
