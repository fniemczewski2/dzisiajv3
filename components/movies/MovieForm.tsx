// components/movies/MovieForm.tsx

"use client";
import React, { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { AddButton, CancelButton } from "../CommonButtons";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";

interface MovieAddFormProps {
  onSubmit: (movie: NewMovieData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export interface NewMovieData {
  title: string;
  genre: string | null;
  rating: number | null;
  platform: string | null;
  description: string | null;
}

async function tmdbFetch<T = unknown>(
  path: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL("/api/tmdb", window.location.origin);
  url.searchParams.set("path", path);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Błąd HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const GENRE_MAP: Record<number, string> = {
  28: "Akcja", 12: "Przygodowy", 16: "Animacja", 35: "Komedia",
  80: "Kryminalny", 99: "Dokumentalny", 18: "Dramat", 10751: "Familijny",
  14: "Fantasy", 36: "Historyczny", 27: "Horror", 10402: "Musical",
  9648: "Tajemnica", 10749: "Romans", 878: "Sci-Fi", 10770: "Film TV",
  53: "Thriller", 10752: "Wojenny", 37: "Western",
};

interface TmdbMovie {
  id: number; title: string; release_date?: string; vote_average: number;
  overview?: string; poster_path?: string; genre_ids?: number[];
  genres?: { id: number; name: string }[];
}
interface TmdbSearchResult { results: TmdbMovie[]; }
interface TmdbDetails { genres?: { id: number; name: string }[]; }
interface TmdbProvider { provider_id: number; provider_name: string; }
interface TmdbWatchProviders {
  results?: { PL?: { flatrate?: TmdbProvider[]; rent?: TmdbProvider[]; buy?: TmdbProvider[]; }; };
}

export default function MovieAddForm({ onSubmit, onCancel, loading = false }: MovieAddFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: "", genre: "", rating: "", platform: "", description: "",
  });
  const [fetchingTMDB, setFetchingTMDB] = useState(false);
  const [tmdbError, setTmdbError] = useState<string | null>(null);
  const [movieOptions, setMovieOptions] = useState<TmdbMovie[]>([]);
  const [showOptions, setShowOptions] = useState(false);

  const fetchTMDBData = async () => {
    if (!formData.title.trim()) return;
    setFetchingTMDB(true);
    setTmdbError(null);
    setShowOptions(false);
    try {
      const data = await tmdbFetch<TmdbSearchResult>("/search/movie", {
        query: formData.title.trim(),
      });
      if (data.results?.length > 0) {
        setMovieOptions(data.results.slice(0, 5));
        setShowOptions(true);
      } else {
        setTmdbError("Nie znaleziono filmu. Spróbuj innego tytułu.");
      }
    } catch {
      toast.error("Wystąpił błąd wyszukiwania TMDB");
    } finally {
      setFetchingTMDB(false);
    }
  };

  const selectMovie = async (movie: TmdbMovie) => {
    setFetchingTMDB(true);
    setTmdbError(null);
    try {
      const details = await tmdbFetch<TmdbDetails>(`/movie/${movie.id}`);
      const providersData = await tmdbFetch<TmdbWatchProviders>(`/movie/${movie.id}/watch/providers`);
      const plProviders = providersData.results?.PL;
      let platformNames: string[] = [];
      if (plProviders) {
        const flatrate = plProviders.flatrate ?? [];
        const rent = plProviders.rent ?? [];
        const buy = plProviders.buy ?? [];
        const combined = flatrate.length > 0 ? flatrate : [...rent, ...buy];
        const unique = Array.from(new Map(combined.map((p) => [p.provider_id, p])).values());
        platformNames = unique.map((p) => p.provider_name);
      }
      const genres =
        details.genres?.length
          ? details.genres.map((g) => g.name).join(", ")
          : (movie.genre_ids ?? []).map((id) => GENRE_MAP[id] ?? "").filter(Boolean).join(", ");

      setFormData((prev) => ({
        ...prev,
        title: movie.title,
        genre: genres,
        rating: movie.vote_average ? movie.vote_average.toFixed(1) : prev.rating,
        platform: platformNames.join(", "),
        description: movie.overview ?? prev.description,
      }));
      setShowOptions(false);
      setMovieOptions([]);
    } catch {
      toast.error("Wystąpił błąd pobierania szczegółów TMDB");
    } finally {
      setFetchingTMDB(false);
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    await withRetry(
      () => onSubmit({
        title: formData.title.trim(),
        genre: formData.genre.trim() || null,
        rating: formData.rating ? parseFloat(formData.rating.replace(",", ".")) : null,
        platform: formData.platform.trim() || null,
        description: formData.description.trim() || null,
      }),
      toast,
      { context: "MovieForm.onSubmit", userId: user?.id }
    );
    setFormData({ title: "", genre: "", rating: "", platform: "", description: "" });
    setMovieOptions([]);
    setShowOptions(false);
    setTmdbError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="form-card mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="form-label">Tytuł:</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input type="text" required value={formData.title}
              onChange={(e) => { setFormData({ ...formData, title: e.target.value }); setShowOptions(false); setTmdbError(null); }}
              className="input-field flex-1" placeholder="Np. Moonlight" />
            <button type="button" onClick={fetchTMDBData}
              disabled={fetchingTMDB || !formData.title.trim()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap">
              {fetchingTMDB ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Szukam...</>
              ) : (
                <><Search className="w-4 h-4" /> Szukaj w TMDB</>
              )}
            </button>
          </div>
          {tmdbError && (
            <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{tmdbError}</p>
          )}
        </div>

        {showOptions && movieOptions.length > 0 && (
          <div className="md:col-span-2 bg-surface border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <p className="form-label">Wybierz z wyników ({movieOptions.length}):</p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {movieOptions.map((movie) => (
                <button key={movie.id} type="button" onClick={() => selectMovie(movie)}
                  className="w-full text-left p-3 card hover:bg-surfaceHover rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary">
                  <div className="flex gap-3">
                    {movie.poster_path && (
                      <img src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                        alt={movie.title} loading="lazy" width={48} height={72}
                        className="w-12 object-cover rounded shadow-sm shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text">
                        {movie.title}
                        {movie.release_date && (
                          <span className="text-textMuted font-normal"> ({movie.release_date.split("-")[0]})</span>
                        )}
                      </p>
                      {movie.vote_average > 0 && (
                        <p className="text-sm text-accent">⭐ {movie.vote_average.toFixed(1)}/10</p>
                      )}
                      {movie.overview && (
                        <p className="text-xs text-textSecondary mt-1 line-clamp-2">{movie.overview}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => { setShowOptions(false); setMovieOptions([]); }}
              className="mt-3 text-sm font-medium text-textMuted hover:text-text transition-colors">
              Zamknij wyniki
            </button>
          </div>
        )}

        <div>
          <label className="form-label">Gatunek:</label>
          <input type="text" value={formData.genre}
            onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
            className="input-field" placeholder="Np. Dramat, Romans" />
        </div>
        <div>
          <label className="form-label">Ocena (0–10):</label>
          <input type="number" step="0.1" min="0" max="10" value={formData.rating}
            onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
            className="input-field" placeholder="7.5" />
        </div>
        <div className="md:col-span-2">
          <label className="form-label">Dostępność:</label>
          <input type="text" value={formData.platform}
            onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
            className="input-field" placeholder="Np. Netflix, HBO Max (wypełni się automatycznie)" />
        </div>
        <div className="md:col-span-2">
          <label className="form-label">Opis:</label>
          <textarea value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input-field" rows={3} placeholder="Krótki opis filmu..." />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <AddButton loading={loading} type="submit" />
        <CancelButton onCancel={onCancel} loading={loading} />
      </div>
    </form>
  );
}