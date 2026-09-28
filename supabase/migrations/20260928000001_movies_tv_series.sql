-- supabase/migrations/20260928000001_movies_tv_series.sql
--
-- Obsługa seriali w zakładce "Filmy". Wszystkie kolumny są opcjonalne albo
-- mają wartość domyślną, więc istniejące wiersze pozostają poprawnymi filmami.

alter table public.movies
  add column if not exists media_type text not null default 'movie',
  add column if not exists tmdb_id integer,
  add column if not exists poster_path text,
  add column if not exists release_year smallint,
  add column if not exists seasons_count smallint,
  add column if not exists episodes_count integer,
  add column if not exists series_status text,
  add column if not exists progress_season smallint,
  add column if not exists progress_episode smallint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'movies_media_type_check') then
    alter table public.movies
      add constraint movies_media_type_check check (media_type in ('movie', 'tv'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'movies_progress_check') then
    alter table public.movies
      add constraint movies_progress_check check (
        (progress_season is null or progress_season >= 1)
        and (progress_episode is null or progress_episode >= 0)
      );
  end if;
  -- poster_path z TMDB ma postać "/abc123.jpg" – nie przyjmujemy pełnych URL-i,
  -- żeby w <img> nie dało się podstawić dowolnej domeny.
  if not exists (select 1 from pg_constraint where conname = 'movies_poster_path_check') then
    alter table public.movies
      add constraint movies_poster_path_check check (
        poster_path is null or poster_path ~ '^/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$'
      );
  end if;
end $$;

create index if not exists movies_user_media_type_idx on public.movies (user_id, media_type);
