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
--
-- Słowniki (schematy, role, uprawnienia, polecenia polityk, poziomy ważności)
-- są zdefiniowane raz na początku; reszta zapytania tylko się do nich odwołuje.

with
-- Schematy aplikacji. Dopisz własne, jeśli używasz innych niż public.
app_schemas (nspname) as (
  values ('public'::name)
),

-- Role, którymi łączy się klient (PostgREST) i serwer.
api_roles (rolname) as (
  values ('anon'::name), ('authenticated'), ('service_role')
),

-- Uprawnienia do tabel; `writes` = zmieniające dane.
table_privileges_list (priv, writes) as (
  values ('SELECT', false), ('INSERT', true), ('UPDATE', true), ('DELETE', true), ('TRUNCATE', true)
),

-- Kody pg_policy.polcmd → nazwa polecenia.
policy_commands (code, command) as (
  values ('r', 'SELECT'), ('a', 'INSERT'), ('w', 'UPDATE'), ('d', 'DELETE'), ('*', 'ALL')
),

-- Poziomy ważności znalezisk (rank = kolejność w wyniku).
severities (rank, severity) as (
  values (1, 'CRITICAL'), (2, 'HIGH'), (3, 'MEDIUM'), (4, 'LOW'), (5, 'INFO')
),

read_privilege as (
  select priv from table_privileges_list where not writes
),

anon_role as (
  select oid from pg_roles where rolname = 'anon'
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

-- Uprawnienia ról API do każdej tabeli: {"anon": ["SELECT", …], …}
table_grants as (
  select t.oid,
         jsonb_object_agg(r.rolname, coalesce(
           (select jsonb_agg(p.priv order by p.priv)
            from table_privileges_list p
            where has_table_privilege(r.rolname, t.oid, p.priv)),
           '[]'::jsonb)) as grants
  from app_tables t
  cross join api_roles r
  where exists (select 1 from pg_roles pr where pr.rolname = r.rolname)
  group by t.oid
),

-- Wszystkie polityki (tabele aplikacji i Storage) opisane jednym sposobem.
all_policies as (
  select pol.polrelid,
         pol.polname,
         pol.polpermissive,
         pol.polcmd,
         pc.command,
         case when pol.polroles = '{0}' then array['public']::name[]
              else array(select rolname from pg_roles where oid = any(pol.polroles) order by 1) end as roles,
         -- polityka obejmuje niezalogowanych: rola PUBLIC albo jawnie anon
         (pol.polroles = '{0}' or (select oid from anon_role) = any(pol.polroles)) as applies_to_anon,
         pg_get_expr(pol.polqual, pol.polrelid) as using_expr,
         pg_get_expr(pol.polwithcheck, pol.polrelid) as check_expr
  from pg_policy pol
  join policy_commands pc on pc.code = pol.polcmd::text
),

policies_json as (
  select polrelid,
         jsonb_agg(jsonb_build_object(
           'name', polname,
           'command', command,
           'permissive', polpermissive,
           'roles', roles,
           'using', using_expr,
           'with_check', check_expr
         ) order by polcmd, polname) as j
  from all_policies
  group by polrelid
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
    'role_grants', tg.grants,

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
        'constraint_def', pg_get_constraintdef(con.oid)
      ) order by con.contype, con.conname), '[]'::jsonb)
      from pg_constraint con
      where con.conrelid = t.oid
    ),

    'indexes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', ic.relname,
        'unique', i.indisunique,
        'primary', i.indisprimary,
        'index_def', pg_get_indexdef(i.indexrelid)
      ) order by ic.relname), '[]'::jsonb)
      from pg_index i
      join pg_class ic on ic.oid = i.indexrelid
      where i.indrelid = t.oid
    ),

    'triggers', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', trg.tgname,
        'enabled', trg.tgenabled <> 'D',
        'trigger_def', pg_get_triggerdef(trg.oid)
      ) order by trg.tgname), '[]'::jsonb)
      from pg_trigger trg
      where trg.tgrelid = t.oid and not trg.tgisinternal
    ),

    'policies', coalesce(pj.j, '[]'::jsonb)
  ) order by t.schema, t.name), '[]'::jsonb) as j
  from app_tables t
  left join table_grants tg on tg.oid = t.oid
  left join policies_json pj on pj.polrelid = t.oid
),

app_views as (
  select c.oid, n.nspname as schema, c.relname as name, c.relkind, c.relowner,
         -- Bez security_invoker=true widok działa z uprawnieniami WŁAŚCICIELA
         -- i omija RLS tabel źródłowych.
         coalesce((select option_value::boolean
                   from pg_options_to_table(c.reloptions)
                   where option_name = 'security_invoker'), false) as security_invoker,
         array(select r.rolname from api_roles r, read_privilege rp
               where has_table_privilege(r.rolname, c.oid, rp.priv)
               order by r.rolname) as select_roles
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in (select nspname from app_schemas)
    and c.relkind in ('v', 'm')
    and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
),

views_json as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'view', v.schema || '.' || v.name,
    'materialized', v.relkind = 'm',
    'owner', pg_get_userbyid(v.relowner),
    'security_invoker', v.security_invoker,
    'select_roles', v.select_roles,
    'view_def', pg_get_viewdef(v.oid, true)
  ) order by v.schema, v.name), '[]'::jsonb) as j
  from app_views v
),

app_functions as (
  select p.oid, n.nspname as schema, p.proname as name, p.prokind,
         p.prosecdef as security_definer, p.proconfig, p.provolatile, p.prolang,
         n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as signature,
         pg_get_function_result(p.oid) as result_type,
         array(select r.rolname from api_roles r
               where has_function_privilege(r.rolname, p.oid, 'EXECUTE')
               order by r.rolname) as execute_roles
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in (select nspname from app_schemas)
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
),

functions_json as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'function', f.signature,
    'kind', case f.prokind when 'p' then 'procedure' when 'a' then 'aggregate'
                           when 'w' then 'window' else 'function' end,
    'returns', f.result_type,
    'language', l.lanname,
    'security_definer', f.security_definer,
    'volatility', case f.provolatile when 'i' then 'immutable' when 's' then 'stable' else 'volatile' end,
    'config', f.proconfig,
    'execute_roles', f.execute_roles,
    'used_by_triggers', (
      select coalesce(jsonb_agg(trg.tgrelid::regclass::text || '.' || trg.tgname), '[]'::jsonb)
      from pg_trigger trg where trg.tgfoid = f.oid and not trg.tgisinternal
    ),
    'function_def', pg_get_functiondef(f.oid)
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
        'table', ap.polrelid::regclass::text,
        'name', ap.polname,
        'command', ap.command,
        'permissive', ap.polpermissive,
        'roles', ap.roles,
        'using', ap.using_expr,
        'with_check', ap.check_expr
      ) order by ap.polrelid::regclass::text, ap.polname), '[]'::jsonb)
      from all_policies ap
      join pg_class c on c.oid = ap.polrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'storage'
    )
  ) as j
),

-- Triggery dopięte przez aplikację do auth.users (np. tworzenie profilu).
auth_triggers_json as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', trg.tgname,
    'enabled', trg.tgenabled <> 'D',
    'trigger_def', pg_get_triggerdef(trg.oid),
    'handler', trg.tgfoid::regprocedure::text
  ) order by trg.tgname), '[]'::jsonb) as j
  from pg_trigger trg
  where trg.tgrelid = 'auth.users'::regclass and not trg.tgisinternal
),

realtime_json as (
  select coalesce(jsonb_agg(pt.schemaname || '.' || pt.tablename order by pt.schemaname, pt.tablename), '[]'::jsonb) as j
  from pg_publication_tables pt
  where pt.pubname = 'supabase_realtime'
),

-- Automatyczne wykrywanie typowych problemów bezpieczeństwa.
-- `rank` odwołuje się do słownika `severities`.
findings as (
  -- 1. Tabela bez RLS: z kluczem anon/authenticated widać i zmieniasz wszystko,
  --    na co pozwalają GRANT-y.
  select 1 as rank, 'rls_disabled' as check_name,
         t.schema || '.' || t.name as object,
         'RLS wyłączone; anon może: ' || coalesce((
           select string_agg(p.priv, ', ')
           from table_privileges_list p
           where p.priv <> 'TRUNCATE' and has_table_privilege('anon', t.oid, p.priv)), 'nic') as detail
  from app_tables t
  where not t.rls_enabled

  union all
  -- 2. RLS włączone, zero polityk: klient nic nie widzi (zwykle celowe dla
  --    tabel obsługiwanych tylko przez service_role – sprawdź, czy tu też).
  select 5, 'rls_without_policies', t.schema || '.' || t.name,
         'RLS bez polityk – dostęp wyłącznie przez service_role'
  from app_tables t
  where t.rls_enabled
    and not exists (select 1 from pg_policy pol where pol.polrelid = t.oid)

  union all
  -- 3. Polityka przepuszczająca wszystko (USING true) dla anon/public.
  --    Odczyt to HIGH, zapis/usuwanie – CRITICAL.
  select case when ap.polcmd = 'r' then 2 else 1 end,
         'policy_allows_all', t.schema || '.' || t.name || ' / ' || ap.polname,
         'USING (true) dla ról: ' || array_to_string(ap.roles, ', ')
  from all_policies ap
  join app_tables t on t.oid = ap.polrelid
  where ap.polpermissive
    and coalesce(ap.using_expr, 'true') = 'true'
    and ap.polcmd <> 'a'
    and ap.applies_to_anon

  union all
  -- 4. INSERT/UPDATE z WITH CHECK (true) – pozwala zapisać dowolny user_id.
  select 2, 'policy_check_true', t.schema || '.' || t.name || ' / ' || ap.polname,
         'WITH CHECK (true) przy ' || ap.command
  from all_policies ap
  join app_tables t on t.oid = ap.polrelid
  where ap.polcmd in ('a', 'w', '*')
    and ap.check_expr = 'true'

  union all
  -- 5. SECURITY DEFINER bez ustalonego search_path – podatne na podmianę
  --    obiektów przez użytkownika z prawem tworzenia w schemacie.
  select 2, 'definer_without_search_path', f.signature,
         'SECURITY DEFINER bez SET search_path'
  from app_functions f
  where f.security_definer
    and not exists (select 1 from unnest(coalesce(f.proconfig, '{}')) c where c like 'search_path=%')

  union all
  -- 6. SECURITY DEFINER wywoływalna przez anon – działa z uprawnieniami
  --    właściciela (zwykle omija RLS) dla niezalogowanych.
  --    Funkcji triggerów (także event_trigger) nie da się wywołać bezpośrednio.
  select 2, 'definer_callable_by_anon', f.signature,
         'anon ma EXECUTE na funkcji SECURITY DEFINER'
  from app_functions f
  where f.security_definer
    and 'anon' = any(f.execute_roles)
    and f.result_type not in ('trigger', 'event_trigger')

  union all
  -- 7. Widok bez security_invoker – omija RLS tabel źródłowych.
  select 2, 'view_bypasses_rls', v.schema || '.' || v.name,
         'widok bez security_invoker=true, dostępny dla: ' || array_to_string(v.select_roles, ', ')
  from app_views v
  where v.relkind = 'v'
    and not v.security_invoker
    and v.select_roles && array['anon', 'authenticated']::name[]

  union all
  -- 8. Tabela z kolumną user_id bez klucza obcego do auth.users – wiersze
  --    zostają po usunięciu konta (brak ON DELETE CASCADE).
  select 3, 'user_id_without_fk', t.schema || '.' || t.name,
         'kolumna user_id bez FK do auth.users'
  from app_tables t
  where exists (select 1 from pg_attribute a
                where a.attrelid = t.oid and a.attname = 'user_id' and not a.attisdropped)
    and not exists (select 1 from pg_constraint con
                    where con.conrelid = t.oid and con.contype = 'f'
                      and con.confrelid = 'auth.users'::regclass)

  union all
  -- 9. Klucz obcy bez indeksu – wolne JOIN-y i kaskadowe DELETE.
  select 4, 'fk_without_index', t.schema || '.' || t.name || ' / ' || con.conname,
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
  select 3, 'public_bucket_unrestricted', 'storage.buckets / ' || b.id,
         concat_ws(', ',
           case when b.allowed_mime_types is null then 'brak allowed_mime_types' end,
           case when b.file_size_limit is null then 'brak file_size_limit' end)
  from storage.buckets b
  where b.public and (b.allowed_mime_types is null or b.file_size_limit is null)
),

ranked_findings as (
  select s.rank, s.severity, f.check_name, f.object, f.detail
  from findings f
  join severities s on s.rank = f.rank
),

findings_json as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'severity', severity, 'check', check_name, 'object', object, 'detail', detail
  ) order by rank, check_name, object), '[]'::jsonb) as j
  from ranked_findings
)

select jsonb_pretty(jsonb_build_object(
  'generated_at', now(),
  'postgres_version', current_setting('server_version'),
  'schemas_scanned', (select jsonb_agg(nspname) from app_schemas),
  'summary', jsonb_build_object(
    'tables', (select count(*) from app_tables),
    'tables_without_rls', (select count(*) from app_tables where not rls_enabled),
    'policy_count', (select count(*) from all_policies ap join app_tables t on t.oid = ap.polrelid),
    'functions', (select count(*) from app_functions where prokind <> 'a'),
    'security_definer_functions', (select count(*) from app_functions where security_definer),
    'findings_by_severity', (select coalesce(jsonb_object_agg(severity, n), '{}'::jsonb)
                             from (select severity, count(*) n from ranked_findings group by severity) s)
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
