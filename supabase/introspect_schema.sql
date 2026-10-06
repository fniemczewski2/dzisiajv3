-- introspect_schema.sql
--
-- Pełny obraz bazy Supabase w JEDNYM wyniku JSON:
-- tabele (kolumny, klucze, indeksy, triggery, RLS, polityki, uprawnienia ról),
-- widoki, funkcje (z kodem i uprawnieniami), typy, sekwencje, rozszerzenia,
-- Storage (buckety + polityki), triggery na auth.users, Realtime
-- oraz automatyczne wykrywanie typowych luk bezpieczeństwa.
--
-- Uruchom w: Dashboard → SQL Editor → Run.
-- Wynik to jedna komórka JSON – skopiuj ją w całości (przycisk "Copy").
-- Zapytanie wyłącznie CZYTA katalog systemowy, niczego nie zmienia.
-- Nie zawiera danych użytkowników, ale kod funkcji i polityk traktuj jako poufny.

with
-- Schematy aplikacji. Dopisz własne, jeśli używasz innych niż public.
app_schemas as (
  select unnest(array['public']) as nspname
),

app_tables as (
  select c.oid, n.nspname as schema, c.relname as name, c.relkind,
         c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced,
         pg_get_userbyid(c.relowner) as owner, c.reltuples::bigint as est_rows,
         obj_description(c.oid, 'pg_class') as comment
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in (select nspname from app_schemas)
    and c.relkind in ('r', 'p')
    -- pomijamy tabele należące do rozszerzeń (np. spatial_ref_sys z PostGIS)
    and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
),

table_privileges as (
  select t.oid,
         jsonb_object_agg(r.rolname, coalesce(
           (select jsonb_agg(p.priv order by p.priv)
            from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE']) as p(priv)
            where has_table_privilege(r.oid, t.oid, p.priv)),
           '[]'::jsonb)) as grants
  from app_tables t
  cross join pg_roles r
  where r.rolname in ('anon', 'authenticated', 'service_role')
  group by t.oid
),

tables_json as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'table', t.schema || '.' || t.name,
    'partitioned', t.relkind = 'p',
    'owner', t.owner,
    'estimated_rows', t.est_rows,
    'comment', t.comment,
    'rls_enabled', t.rls_enabled,
    'rls_forced', t.rls_forced,
    'role_grants', tp.grants,

    'columns', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', a.attname,
        'type', format_type(a.atttypid, a.atttypmod),
        'not_null', a.attnotnull,
        'default', pg_get_expr(d.adbin, d.adrelid),
        'identity', nullif(a.attidentity, ''),
        'generated', nullif(a.attgenerated, '')
      ) order by a.attnum), '[]'::jsonb)
      from pg_attribute a
      left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
    ),

    'constraints', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', con.conname,
        'type', case con.contype
                  when 'p' then 'PRIMARY KEY' when 'f' then 'FOREIGN KEY'
                  when 'u' then 'UNIQUE' when 'c' then 'CHECK'
                  when 'x' then 'EXCLUDE' else con.contype::text end,
        'definition', pg_get_constraintdef(con.oid)
      ) order by con.contype, con.conname), '[]'::jsonb)
      from pg_constraint con
      where con.conrelid = t.oid
    ),

    'indexes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', ic.relname,
        'unique', i.indisunique,
        'primary', i.indisprimary,
        'definition', pg_get_indexdef(i.indexrelid)
      ) order by ic.relname), '[]'::jsonb)
      from pg_index i
      join pg_class ic on ic.oid = i.indexrelid
      where i.indrelid = t.oid
    ),

    'triggers', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', tg.tgname,
        'enabled', tg.tgenabled <> 'D',
        'definition', pg_get_triggerdef(tg.oid)
      ) order by tg.tgname), '[]'::jsonb)
      from pg_trigger tg
      where tg.tgrelid = t.oid and not tg.tgisinternal
    ),

    'policies', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', pol.polname,
        'command', case pol.polcmd
                     when 'r' then 'SELECT' when 'a' then 'INSERT'
                     when 'w' then 'UPDATE' when 'd' then 'DELETE'
                     else 'ALL' end,
        'permissive', pol.polpermissive,
        'roles', case when pol.polroles = '{0}' then array['public']
                      else array(select rolname from pg_roles where oid = any(pol.polroles) order by 1) end,
        'using', pg_get_expr(pol.polqual, pol.polrelid),
        'with_check', pg_get_expr(pol.polwithcheck, pol.polrelid)
      ) order by pol.polcmd, pol.polname), '[]'::jsonb)
      from pg_policy pol
      where pol.polrelid = t.oid
    )
  ) order by t.schema, t.name), '[]'::jsonb) as j
  from app_tables t
  left join table_privileges tp on tp.oid = t.oid
),

views_json as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'view', n.nspname || '.' || c.relname,
    'materialized', c.relkind = 'm',
    'owner', pg_get_userbyid(c.relowner),
    -- Bez security_invoker=true widok działa z uprawnieniami WŁAŚCICIELA
    -- i omija RLS tabel źródłowych.
    'security_invoker', coalesce(
      (select option_value::boolean
       from pg_options_to_table(c.reloptions)
       where option_name = 'security_invoker'), false),
    'anon_can_select', has_table_privilege('anon', c.oid, 'SELECT'),
    'authenticated_can_select', has_table_privilege('authenticated', c.oid, 'SELECT'),
    'definition', pg_get_viewdef(c.oid, true)
  ) order by n.nspname, c.relname), '[]'::jsonb) as j
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in (select nspname from app_schemas)
    and c.relkind in ('v', 'm')
    and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
),

app_functions as (
  select p.oid, n.nspname as schema, p.proname as name, p.prokind,
         p.prosecdef as security_definer, p.proconfig, p.provolatile, p.prolang
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in (select nspname from app_schemas)
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
),

functions_json as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'function', f.schema || '.' || f.name || '(' || pg_get_function_identity_arguments(f.oid) || ')',
    'kind', case f.prokind when 'p' then 'procedure' when 'a' then 'aggregate'
                           when 'w' then 'window' else 'function' end,
    'returns', pg_get_function_result(f.oid),
    'language', l.lanname,
    'security_definer', f.security_definer,
    'volatility', case f.provolatile when 'i' then 'immutable' when 's' then 'stable' else 'volatile' end,
    'config', f.proconfig,
    'anon_can_execute', has_function_privilege('anon', f.oid, 'EXECUTE'),
    'authenticated_can_execute', has_function_privilege('authenticated', f.oid, 'EXECUTE'),
    'used_by_triggers', (
      select coalesce(jsonb_agg(tg.tgrelid::regclass::text || '.' || tg.tgname), '[]'::jsonb)
      from pg_trigger tg where tg.tgfoid = f.oid and not tg.tgisinternal
    ),
    'definition', pg_get_functiondef(f.oid)
  ) order by f.schema, f.name), '[]'::jsonb) as j
  from app_functions f
  join pg_language l on l.oid = f.prolang
  where f.prokind <> 'a'
),

types_json as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'type', n.nspname || '.' || t.typname,
    'kind', case t.typtype when 'e' then 'enum' when 'd' then 'domain' when 'c' then 'composite' else t.typtype::text end,
    'enum_values', case when t.typtype = 'e' then
                     (select jsonb_agg(e.enumlabel order by e.enumsortorder) from pg_enum e where e.enumtypid = t.oid)
                   end,
    'domain_base', case when t.typtype = 'd' then format_type(t.typbasetype, t.typtypmod) end
  ) order by n.nspname, t.typname), '[]'::jsonb) as j
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname in (select nspname from app_schemas)
    and (t.typtype in ('e', 'd')
         or (t.typtype = 'c' and exists (select 1 from pg_class c where c.oid = t.typrelid and c.relkind = 'c')))
    and not exists (select 1 from pg_depend d where d.objid = t.oid and d.deptype = 'e')
),

sequences_json as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'sequence', s.schemaname || '.' || s.sequencename,
    'owned_by', (
      select d.refobjid::regclass::text || '.' || a.attname
      from pg_depend d
      join pg_attribute a on a.attrelid = d.refobjid and a.attnum = d.refobjsubid
      where d.objid = (quote_ident(s.schemaname) || '.' || quote_ident(s.sequencename))::regclass
        and d.deptype in ('a', 'i')
      limit 1
    ),
    'last_value', s.last_value
  ) order by s.schemaname, s.sequencename), '[]'::jsonb) as j
  from pg_sequences s
  where s.schemaname in (select nspname from app_schemas)
),

extensions_json as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', e.extname, 'version', e.extversion, 'schema', n.nspname
  ) order by e.extname), '[]'::jsonb) as j
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
),

storage_json as (
  select jsonb_build_object(
    'buckets', (
      select coalesce(jsonb_agg(to_jsonb(b) order by b.id), '[]'::jsonb)
      from (
        select id, name, public, file_size_limit, allowed_mime_types
        from storage.buckets
      ) b
    ),
    'policies', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'table', pol.polrelid::regclass::text,
        'name', pol.polname,
        'command', case pol.polcmd
                     when 'r' then 'SELECT' when 'a' then 'INSERT'
                     when 'w' then 'UPDATE' when 'd' then 'DELETE' else 'ALL' end,
        'permissive', pol.polpermissive,
        'roles', case when pol.polroles = '{0}' then array['public']
                      else array(select rolname from pg_roles where oid = any(pol.polroles) order by 1) end,
        'using', pg_get_expr(pol.polqual, pol.polrelid),
        'with_check', pg_get_expr(pol.polwithcheck, pol.polrelid)
      ) order by pol.polrelid::regclass::text, pol.polname), '[]'::jsonb)
      from pg_policy pol
      join pg_class c on c.oid = pol.polrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'storage'
    )
  ) as j
),

-- Triggery dopięte przez aplikację do auth.users (np. tworzenie profilu).
auth_triggers_json as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', tg.tgname,
    'enabled', tg.tgenabled <> 'D',
    'definition', pg_get_triggerdef(tg.oid),
    'function', tg.tgfoid::regprocedure::text
  ) order by tg.tgname), '[]'::jsonb) as j
  from pg_trigger tg
  where tg.tgrelid = 'auth.users'::regclass and not tg.tgisinternal
),

realtime_json as (
  select coalesce(jsonb_agg(pt.schemaname || '.' || pt.tablename order by pt.schemaname, pt.tablename), '[]'::jsonb) as j
  from pg_publication_tables pt
  where pt.pubname = 'supabase_realtime'
),

-- Automatyczne wykrywanie typowych problemów bezpieczeństwa.
findings as (
  -- 1. Tabela bez RLS: z kluczem anon/authenticated widać i zmieniasz wszystko,
  --    na co pozwalają GRANT-y.
  select 'CRITICAL' as severity, 'rls_disabled' as check_name,
         t.schema || '.' || t.name as object,
         'RLS wyłączone; anon może: ' || coalesce((
           select string_agg(p.priv, ', ')
           from unnest(array['SELECT','INSERT','UPDATE','DELETE']) as p(priv)
           where has_table_privilege('anon', t.oid, p.priv)), 'nic') as detail
  from app_tables t
  where not t.rls_enabled

  union all
  -- 2. RLS włączone, zero polityk: klient nic nie widzi (zwykle celowe dla
  --    tabel obsługiwanych tylko przez service_role – sprawdź, czy tu też).
  select 'INFO', 'rls_without_policies', t.schema || '.' || t.name,
         'RLS bez polityk – dostęp wyłącznie przez service_role'
  from app_tables t
  where t.rls_enabled
    and not exists (select 1 from pg_policy pol where pol.polrelid = t.oid)

  union all
  -- 3. Polityka przepuszczająca wszystko (USING true) dla anon/public.
  select case when pol.polcmd = 'r' then 'HIGH' else 'CRITICAL' end,
         'policy_allows_all', t.schema || '.' || t.name || ' / ' || pol.polname,
         'USING (true) dla ról: ' || case when pol.polroles = '{0}' then 'public'
           else (select string_agg(rolname, ', ') from pg_roles where oid = any(pol.polroles)) end
  from pg_policy pol
  join app_tables t on t.oid = pol.polrelid
  where pol.polpermissive
    and coalesce(pg_get_expr(pol.polqual, pol.polrelid), 'true') = 'true'
    and pol.polcmd <> 'a'
    and (pol.polroles = '{0}'
         or (select oid from pg_roles where rolname = 'anon') = any(pol.polroles))

  union all
  -- 4. INSERT/UPDATE z WITH CHECK (true) – pozwala zapisać dowolny user_id.
  select 'HIGH', 'policy_check_true', t.schema || '.' || t.name || ' / ' || pol.polname,
         'WITH CHECK (true) przy ' || case pol.polcmd when 'a' then 'INSERT' when 'w' then 'UPDATE' else 'ALL' end
  from pg_policy pol
  join app_tables t on t.oid = pol.polrelid
  where pol.polcmd in ('a', 'w', '*')
    and pg_get_expr(pol.polwithcheck, pol.polrelid) = 'true'

  union all
  -- 5. SECURITY DEFINER bez ustalonego search_path – podatne na podmianę
  --    obiektów przez użytkownika z prawem tworzenia w schemacie.
  select 'HIGH', 'definer_without_search_path',
         f.schema || '.' || f.name || '(' || pg_get_function_identity_arguments(f.oid) || ')',
         'SECURITY DEFINER bez SET search_path'
  from app_functions f
  where f.security_definer
    and not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%')

  union all
  -- 6. SECURITY DEFINER wywoływalna przez anon – działa z uprawnieniami
  --    właściciela (zwykle omija RLS) dla niezalogowanych.
  select 'HIGH', 'definer_callable_by_anon',
         f.schema || '.' || f.name || '(' || pg_get_function_identity_arguments(f.oid) || ')',
         'anon ma EXECUTE na funkcji SECURITY DEFINER'
  from app_functions f
  where f.security_definer
    and has_function_privilege('anon', f.oid, 'EXECUTE')
    -- funkcji triggerów (także event_trigger) nie da się wywołać bezpośrednio
    and pg_get_function_result(f.oid) not in ('trigger', 'event_trigger')

  union all
  -- 7. Widok bez security_invoker – omija RLS tabel źródłowych.
  select 'HIGH', 'view_bypasses_rls', n.nspname || '.' || c.relname,
         'widok bez security_invoker=true, dostępny dla: ' ||
         concat_ws(', ',
           case when has_table_privilege('anon', c.oid, 'SELECT') then 'anon' end,
           case when has_table_privilege('authenticated', c.oid, 'SELECT') then 'authenticated' end)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in (select nspname from app_schemas)
    and c.relkind = 'v'
    and not coalesce((select option_value::boolean from pg_options_to_table(c.reloptions)
                      where option_name = 'security_invoker'), false)
    and (has_table_privilege('anon', c.oid, 'SELECT') or has_table_privilege('authenticated', c.oid, 'SELECT'))
    and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')

  union all
  -- 8. Tabela z kolumną user_id bez klucza obcego do auth.users – wiersze
  --    zostają po usunięciu konta (brak ON DELETE CASCADE).
  select 'MEDIUM', 'user_id_without_fk', t.schema || '.' || t.name,
         'kolumna user_id bez FK do auth.users'
  from app_tables t
  where exists (select 1 from pg_attribute a
                where a.attrelid = t.oid and a.attname = 'user_id' and not a.attisdropped)
    and not exists (select 1 from pg_constraint con
                    where con.conrelid = t.oid and con.contype = 'f'
                      and con.confrelid = 'auth.users'::regclass)

  union all
  -- 9. Klucz obcy bez indeksu – wolne JOIN-y i kaskadowe DELETE.
  select 'LOW', 'fk_without_index', t.schema || '.' || t.name || ' / ' || con.conname,
         pg_get_constraintdef(con.oid)
  from pg_constraint con
  join app_tables t on t.oid = con.conrelid
  where con.contype = 'f'
    and not exists (
      select 1 from pg_index i
      where i.indrelid = con.conrelid
        and (i.indkey::int2[])[0:cardinality(con.conkey) - 1] @> con.conkey
    )

  union all
  -- 10. Publiczny bucket bez limitu typu lub rozmiaru plików.
  select 'MEDIUM', 'public_bucket_unrestricted', 'storage.buckets / ' || b.id,
         concat_ws(', ',
           case when b.allowed_mime_types is null then 'brak allowed_mime_types' end,
           case when b.file_size_limit is null then 'brak file_size_limit' end)
  from storage.buckets b
  where b.public and (b.allowed_mime_types is null or b.file_size_limit is null)
),

findings_json as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'severity', severity, 'check', check_name, 'object', object, 'detail', detail
  ) order by case severity when 'CRITICAL' then 1 when 'HIGH' then 2 when 'MEDIUM' then 3
                           when 'LOW' then 4 else 5 end, check_name, object), '[]'::jsonb) as j
  from findings
)

select jsonb_pretty(jsonb_build_object(
  'generated_at', now(),
  'postgres_version', current_setting('server_version'),
  'schemas_scanned', (select jsonb_agg(nspname) from app_schemas),
  'summary', jsonb_build_object(
    'tables', (select count(*) from app_tables),
    'tables_without_rls', (select count(*) from app_tables where not rls_enabled),
    'policies', (select count(*) from pg_policy pol join app_tables t on t.oid = pol.polrelid),
    'functions', (select count(*) from app_functions where prokind <> 'a'),
    'security_definer_functions', (select count(*) from app_functions where security_definer),
    'findings_by_severity', (select coalesce(jsonb_object_agg(severity, n), '{}'::jsonb)
                             from (select severity, count(*) n from findings group by severity) s)
  ),
  'security_findings', (select j from findings_json),
  'tables', (select j from tables_json),
  'views', (select j from views_json),
  'functions', (select j from functions_json),
  'types', (select j from types_json),
  'sequences', (select j from sequences_json),
  'extensions', (select j from extensions_json),
  'storage', (select j from storage_json),
  'auth_users_triggers', (select j from auth_triggers_json),
  'realtime_tables', (select j from realtime_json)
)) as database_snapshot;
