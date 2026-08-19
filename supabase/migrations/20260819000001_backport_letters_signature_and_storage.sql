-- Backports database objects that already exist on the live project but were
-- never captured in a tracked migration (schema drift): the letters
-- auto-signature trigger, the updated_at trigger, and the storage buckets +
-- RLS policies for "avatars"/"letters". Without this, a fresh
-- `supabase db reset` (or a new environment built from migrations alone)
-- would be missing all of it — letter creation would violate NOT NULL
-- constraints, and every avatar/letter file upload would be rejected by RLS.
-- All statements are idempotent so re-running this migration is a no-op.

create or replace function public.compute_letter_signature()
returns trigger
language plpgsql
as $function$
declare
  v_code text;
  v_next_seq integer;
  v_year integer;
begin
  v_year := extract(year from new.issue_date)::integer;

  v_code := case new.category
    when 'UDIP' then 'U'
    when 'Wniosek' then 'A'
    when 'Skarga' then 'S'
    when 'Wykroczenie drogowe' then 'RD'
    when 'Wykroczenie' then 'W'
    when 'Przestępstwo' then 'K'
    else new.category_code  -- 'Inne': kod dostarczony przez klienta
  end;

  if v_code is null or length(trim(v_code)) = 0 then
    raise exception 'category_code jest wymagany dla kategorii "Inne"';
  end if;

  -- Serializacja per (user_id, rok), żeby dwa równoczesne inserty nie
  -- dostały tego samego sequence_number.
  perform pg_advisory_xact_lock(hashtext(new.user_id::text || ':' || v_year::text));

  select coalesce(max(sequence_number), 0) + 1
    into v_next_seq
    from public.letters
    where user_id = new.user_id
      and sequence_year = v_year;

  new.category_code := v_code;
  new.sequence_year := v_year;
  new.sequence_number := v_next_seq;
  new.signature := v_next_seq::text || '.' || to_char(new.issue_date, 'MM') || '.' || v_year::text || '.' || v_code;

  return new;
end;
$function$;

drop trigger if exists letters_before_insert on public.letters;
create trigger letters_before_insert
  before insert on public.letters
  for each row execute function public.compute_letter_signature();

create or replace function public.set_letters_updated_at()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists letters_set_updated_at on public.letters;
create trigger letters_set_updated_at
  before update on public.letters
  for each row execute function public.set_letters_updated_at();

-- Storage buckets (id, public). file_size_limit/allowed_mime_types are left
-- unset to match the live configuration; app code already enforces the PDF
-- MIME type and MAX_LETTER_PDF_SIZE_MB client-side.
--
-- 'avatars'/'letters' are repeated across these independent DDL statements
-- (Sonar plsql:S1192 flags the duplication) — a migration file has no
-- session/variable scope spanning separate `create policy`/`insert`
-- statements the way a function body would, and this migration has already
-- been applied to production, so it isn't rewritten to a dynamic-SQL DO
-- block just to dedupe a literal; that would add real risk (quoting,
-- formatting drift) for no behavior change. NOSONAR
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true) -- NOSONAR
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('letters', 'letters', false) -- NOSONAR
on conflict (id) do nothing;

drop policy if exists "Public Access" on storage.objects;
create policy "Public Access" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatars" on storage.objects;
create policy "Users can upload their own avatars" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid() = owner);

drop policy if exists "Users can update their own avatars" on storage.objects;
create policy "Users can update their own avatars" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid() = owner);

-- letters_storage_* policies require the uploader's user id to be the first
-- path segment (storage.foldername(name)[1]) — i.e. object keys must look
-- like "<user_id>/...", not a flat "user_id.something" filename.
drop policy if exists "letters_storage_select_own" on storage.objects;
create policy "letters_storage_select_own" on storage.objects
  for select using (bucket_id = 'letters' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "letters_storage_insert_own" on storage.objects;
create policy "letters_storage_insert_own" on storage.objects
  for insert with check (bucket_id = 'letters' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "letters_storage_update_own" on storage.objects;
create policy "letters_storage_update_own" on storage.objects
  for update using (bucket_id = 'letters' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "letters_storage_delete_own" on storage.objects;
create policy "letters_storage_delete_own" on storage.objects
  for delete using (bucket_id = 'letters' and (storage.foldername(name))[1] = auth.uid()::text);
