
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
  created_at?: string;
  updated_at?: string;
}

export interface NewMovieData {
  title: string;
  genre: string | null;
  rating: number | null;
  platform: string | null;
  description: string | null;
}

export interface TmdbMovie {
  id: number; title: string; release_date?: string; vote_average: number;
  overview?: string; poster_path?: string; genre_ids?: number[];
  genres?: { id: number; name: string }[];
}

export interface TmdbSearchResult { results: TmdbMovie[]; }
export interface TmdbDetails { genres?: { id: number; name: string }[]; }
export interface TmdbProvider { provider_id: number; provider_name: string; }
export interface TmdbWatchProviders {
  results?: { PL?: { flatrate?: TmdbProvider[]; rent?: TmdbProvider[]; buy?: TmdbProvider[]; }; };
}

export type MovieInsert = Omit<Movie, "id" | "created_at" | "updated_at">;
export type MovieUpdate = Partial<MovieInsert> & { id: string };
