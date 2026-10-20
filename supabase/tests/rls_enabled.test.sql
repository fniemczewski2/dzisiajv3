-- supabase/tests/rls_enabled.test.sql – uruchamiane przez `supabase test db` (pgTAP).
--
-- Każda tabela w schemacie public ma włączone RLS (poza publicznym rozkładem
-- przystanków), a rola anon nie ma dostępu do tabel poza wizytówkami.

-- Nazwa schematu w jednym miejscu (zmienna psql – pg_prove uruchamia plik przez psql).
\set app_schema public

begin;
select plan(3);

select is(
  (select array_agg(c.relname::text order by c.relname)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = :'app_schema' and c.relkind = 'r' and not c.relrowsecurity
      and c.relname not in ('stops', 'spatial_ref_sys')),
  null,
  'Wszystkie tabele public (poza stops) mają włączone RLS'
);

select is(
  (select array_agg(table_name::text order by table_name)
     from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = :'app_schema' and table_name <> 'vcard_profiles'),
  null,
  'Rola anon nie ma uprawnień do tabel poza vcard_profiles'
);

select is(
  (select count(*)::int from information_schema.role_table_grants
    where grantee in ('anon', 'authenticated') and table_schema = :'app_schema' and privilege_type = 'TRUNCATE'),
  0,
  'Ani anon, ani authenticated nie mogą wykonać TRUNCATE (omija RLS)'
);

select * from finish();
rollback;
