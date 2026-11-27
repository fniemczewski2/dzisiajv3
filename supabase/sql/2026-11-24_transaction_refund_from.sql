-- Kategoria „Do zwrotu”: wydatek poniesiony za kogoś, który ma wrócić.
-- Taka transakcja jest zapisywana jako wpływ (zwrot powiększy stan), a `refund_from` mówi, od kogo.
-- Skrypt idempotentny.

begin;

alter table public.transactions
  add column if not exists refund_from text;

commit;
