-- 2026-11-12_rls_initplan.sql
--
-- Polityki RLS w schemacie public: `auth.uid()` w warunku jest wyliczane dla każdego wiersza. Opakowanie w
-- `(select auth.uid())` powoduje jednorazowe wyliczenie na zapytanie (initplan), co przyspiesza zapytania na większych
-- tabelach. Skrypt przepisuje warunki USING i WITH CHECK wszystkich polityk, które jeszcze go nie opakowują.
-- Znaczenie polityk się nie zmienia; role (TO ...) i rodzaj polityki (FOR ...) pozostają bez zmian.
-- Bezpieczny do ponownego uruchomienia (opakowane już wywołania są pomijane).
--
-- Kontrola po uruchomieniu (powinna zwrócić 0 wierszy):
--   select schemaname, tablename, policyname from pg_policies
--    where schemaname = 'public' and (coalesce(qual, '') || coalesce(with_check, '')) ~ '(?<!SELECT )auth\.uid\(\)';

do $$
declare
  -- Wywołanie auth.uid() nieopakowane w SELECT (lookbehind: już opakowane są pomijane).
  unwrapped_uid constant text := '(?<!SELECT )auth\.uid\(\)';
  p record;
  new_qual text;
  new_check text;
  stmt text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
      from pg_policies
     where schemaname = 'public'
       and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ unwrapped_uid
  loop
    new_qual := case when p.qual is null then null
      else regexp_replace(p.qual, unwrapped_uid, '(select auth.uid())', 'g') end;
    new_check := case when p.with_check is null then null
      else regexp_replace(p.with_check, unwrapped_uid, '(select auth.uid())', 'g') end;

    stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename)
      || case when new_qual is not null then format(' using (%s)', new_qual) else '' end
      || case when new_check is not null then format(' with check (%s)', new_check) else '' end;

    execute stmt;
    raise notice 'Zaktualizowano politykę % na %.%', p.policyname, p.schemaname, p.tablename;
  end loop;
end $$;
