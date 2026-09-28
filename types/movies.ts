// types/movies.ts

export type MediaType = "movie" | "tv";

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  movie: "Film",
  tv: "Serial",
};

export interface Movie {
  id: string;
  user_id: string;
  title: string;
  genre: string | null;
  rating: number | null;
  platform: string | null;
  description: string | null;
  watched: boolean;
  notes: string;
  /** Brak w starszych wierszach sprzed migracji – traktujemy jak "movie". */
  media_type?: MediaType | null;
  tmdb_id?: number | null;
  poster_path?: string | null;
  release_year?: number | null;
  seasons_count?: number | null;
  episodes_count?: number | null;
  series_status?: string | null;
  progress_season?: number | null;
  progress_episode?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface NewMovieData {
  title: string;
  genre: string | null;
  rating: number | null;
  platform: string | null;
  description: string | null;
  media_type: MediaType;
  tmdb_id: number | null;
  poster_path: string | null;
  release_year: number | null;
  seasons_count: number | null;
  episodes_count: number | null;
  series_status: string | null;
}

/* ---------- Surowe odpowiedzi TMDB ---------- */

export interface TmdbGenre { id: number; name: string }
export interface TmdbProvider { provider_id: number; provider_name: string }
export interface TmdbWatchProviders {
  results?: { PL?: { flatrate?: TmdbProvider[]; rent?: TmdbProvider[]; buy?: TmdbProvider[]; ads?: TmdbProvider[]; free?: TmdbProvider[] } };
}

/** Wynik /search/multi – filmy mają `title`, seriale `name`. */
export interface TmdbMultiResult {
  id: number;
  media_type: "movie" | "tv" | "person" | string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  overview?: string;
  poster_path?: string | null;
  genre_ids?: number[];
  popularity?: number;
}

export interface TmdbSearchResponse { results?: TmdbMultiResult[] }

export interface TmdbDetailsResponse {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genres?: TmdbGenre[];
  // tylko seriale
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  "watch/providers"?: TmdbWatchProviders;
}

/* ---------- Znormalizowane wyniki dla UI ---------- */

export interface MediaSearchResult {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: number | null;
  rating: number | null;
  overview: string;
  posterPath: string | null;
  genreIds: number[];
}

export type MovieInsert = Omit<Movie, "id" | "user_id" | "created_at" | "updated_at">;
export type MovieUpdate = Partial<MovieInsert> & { id: string };
