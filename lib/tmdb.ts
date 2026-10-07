// lib/tmdb.ts

import type {
  MediaSearchResult,
  MediaType,
  NewMovieData,
  TmdbDetailsResponse,
  TmdbMultiResult,
  TmdbSearchResponse,
  TmdbWatchProviders,
} from "@/types/movies";

export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const POSTER_PATH_RE = /^\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/;

const GENRES: Record<number, string> = {
  28: "Akcja", 12: "Przygodowy", 16: "Animacja", 35: "Komedia",
  80: "Kryminalny", 99: "Dokumentalny", 18: "Dramat", 10751: "Familijny",
  14: "Fantasy", 36: "Historyczny", 27: "Horror", 10402: "Muzyczny",
  9648: "Tajemnica", 10749: "Romans", 878: "Sci-Fi", 10770: "Film TV",
  53: "Thriller", 10752: "Wojenny", 37: "Western",
  10759: "Akcja i przygoda", 10762: "Dla dzieci", 10763: "Wiadomości",
  10764: "Reality show", 10765: "Sci-Fi i fantasy", 10766: "Telenowela",
  10767: "Talk show", 10768: "Wojna i polityka",
};

const SERIES_STATUS: Record<string, string> = {
  "Returning Series": "Emitowany",
  "In Production": "W produkcji",
  Planned: "Zapowiedziany",
  Pilot: "Pilot",
  Ended: "Zakończony",
  Canceled: "Anulowany",
  Cancelled: "Anulowany",
};

export function translateSeriesStatus(status: string | undefined | null): string | null {
  if (!status) return null;
  return SERIES_STATUS[status] ?? status;
}

export function isSafePosterPath(path: unknown): path is string {
  return typeof path === "string" && POSTER_PATH_RE.test(path);
}

export function posterUrl(path: string | null | undefined, size: "w92" | "w154" | "w185" = "w154"): string | null {
  return isSafePosterPath(path) ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}

function yearOf(date: string | undefined): number | null {
  const y = Number.parseInt((date ?? "").slice(0, 4), 10);
  return Number.isFinite(y) && y > 1800 ? y : null;
}

function roundRating(v: number | undefined): number | null {
  return typeof v === "number" && v > 0 ? Math.round(v * 10) / 10 : null;
}

/** Zamienia wyniki /search/multi na wspólny kształt; pomija osoby i nieznane typy. */
export function normalizeSearchResults(data: TmdbSearchResponse, filter: MediaType | "all" = "all"): MediaSearchResult[] {
  return (data.results ?? [])
    .filter((r): r is TmdbMultiResult & { media_type: MediaType } => r.media_type === "movie" || r.media_type === "tv")
    .filter((r) => filter === "all" || r.media_type === filter)
    .map((r) => ({
      tmdbId: r.id,
      mediaType: r.media_type,
      title: (r.media_type === "tv" ? r.name : r.title) ?? r.original_title ?? r.original_name ?? "",
      year: yearOf(r.media_type === "tv" ? r.first_air_date : r.release_date),
      rating: roundRating(r.vote_average),
      overview: r.overview ?? "",
      posterPath: isSafePosterPath(r.poster_path) ? r.poster_path : null,
      genreIds: r.genre_ids ?? [],
    }))
    .filter((r) => r.title);
}

/**
 * Platformy w Polsce: najpierw abonament (flatrate) i darmowe z reklamami,
 * a gdy ich brak – wypożyczenie/zakup.
 */
export function extractPolishProviders(providers: TmdbWatchProviders | undefined): string[] {
  const pl = providers?.results?.PL;
  if (!pl) return [];
  const primary = [...(pl.flatrate ?? []), ...(pl.free ?? []), ...(pl.ads ?? [])];
  const combined = primary.length > 0 ? primary : [...(pl.rent ?? []), ...(pl.buy ?? [])];
  return Array.from(new Map(combined.map((p) => [p.provider_id, p.provider_name])).values());
}

/** Buduje dane formularza z wyniku wyszukiwania i szczegółów pozycji. */
export function buildMovieData(result: MediaSearchResult, details: TmdbDetailsResponse | null): NewMovieData {
  const genres = details?.genres?.length
    ? details.genres.map((g) => g.name)
    : result.genreIds.map((id) => GENRES[id]).filter(Boolean);
  const isTv = result.mediaType === "tv";
  const poster = isSafePosterPath(details?.poster_path) ? details!.poster_path! : result.posterPath;

  return {
    title: (isTv ? details?.name : details?.title) || result.title,
    genre: genres.length ? genres.join(", ") : null,
    rating: roundRating(details?.vote_average) ?? result.rating,
    platform: extractPolishProviders(details?.["watch/providers"]).join(", ") || null,
    description: (details?.overview || result.overview || "").trim() || null,
    media_type: result.mediaType,
    tmdb_id: result.tmdbId,
    poster_path: poster ?? null,
    release_year: yearOf(isTv ? details?.first_air_date : details?.release_date) ?? result.year,
    seasons_count: isTv ? details?.number_of_seasons ?? null : null,
    episodes_count: isTv ? details?.number_of_episodes ?? null : null,
    series_status: isTv ? translateSeriesStatus(details?.status) : null,
  };
}

/* ---------- Klient (przeglądarka -> /api/tmdb) ---------- */

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}, signal?: AbortSignal): Promise<T> {
  const url = new URL("/api/tmdb", globalThis.location?.origin);
  url.searchParams.set("path", path);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const res = await fetch(url.toString(), { signal });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Błąd HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function searchMedia(query: string, filter: MediaType | "all" = "all", signal?: AbortSignal) {
  const path = filter === "all" ? "/search/multi" : `/search/${filter}`;
  const data = await tmdbFetch<TmdbSearchResponse>(path, { query: query.trim() }, signal);
  if (filter !== "all") {
    data.results = (data.results ?? []).map((r) => ({ ...r, media_type: filter }));
  }
  return normalizeSearchResults(data, filter).slice(0, 8);
}

export function fetchMediaDetails(mediaType: MediaType, tmdbId: number, signal?: AbortSignal) {
  return tmdbFetch<TmdbDetailsResponse>(`/${mediaType}/${tmdbId}`, { append_to_response: "watch/providers" }, signal);
}
