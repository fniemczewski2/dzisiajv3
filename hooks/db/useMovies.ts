// hooks/db/useMovies.ts

import { useCallback } from "react";
import type { Movie, MovieInsert, NewMovieData } from "@/types/movies";
import { useToast } from "@/providers/ToastProvider";
import { buildMovieData, fetchMediaDetails } from "@/lib/tmdb";
import { useCrudResource } from "./useCrudResource";

import { omit } from "@/lib/objectUtils";
// Tabela `movies` trzyma zarówno filmy, jak i seriale – komunikaty są neutralne.
const MESSAGES = {
  fetchError: "Błąd pobierania filmów i seriali.",
  added: "Dodano do listy",
  addError: "Błąd dodawania pozycji.",
  edited: "Zaktualizowano pozycję",
  editError: "Błąd aktualizacji pozycji.",
  deleted: "Usunięto z listy",
  deleteError: "Błąd usuwania pozycji.",
  confirmDelete: "Czy chcesz usunąć tę pozycję z listy?",
};

export function useMovies() {
  const { toast } = useToast();
  const crud = useCrudResource<Movie, MovieInsert>({
    table: "movies",
    insertPosition: "start",
    // Bez znaczników czasu nowa pozycja lądowała na końcu przy sortowaniu po dacie.
    buildOptimistic: (payload, tempId, userId) => {
      const now = new Date().toISOString();
      return { ...payload, id: tempId, user_id: userId, created_at: now, updated_at: now };
    },
    messages: MESSAGES,
  });

  const findMovie = useCallback((id: string) => crud.items.find((m) => m.id === id), [crud.items]);

  const addMovie = useCallback(
    async (data: NewMovieData): Promise<boolean> => {
      const isTv = data.media_type === "tv";
      const created = await crud.add({
        ...data,
        watched: false,
        notes: "",
        progress_season: isTv ? 1 : null,
        progress_episode: isTv ? 0 : null,
      });
      return Boolean(created);
    },
    [crud]
  );

  const updateMovie = useCallback(
    async (movie: Movie, options: { silent?: boolean } = {}): Promise<void> => {
      const { id } = movie;
      const updates = omit(movie, ["id", "user_id", "created_at"]);
      await crud.patch(id, { ...updates, updated_at: new Date().toISOString() }, {
        silent: options.silent,
        successMessage: MESSAGES.edited,
        errorMessage: MESSAGES.editError,
      });
    },
    [crud]
  );

  const deleteMovie = useCallback(async (id: string): Promise<void> => { await crud.remove(id); }, [crud]);

  const toggleWatched = useCallback(
    async (id: string): Promise<void> => {
      const movie = findMovie(id);
      if (!movie) return;
      const nextWatched = !movie.watched;
      await updateMovie({ ...movie, watched: nextWatched }, { silent: true });
      const isTv = movie.media_type === "tv";
      const watchedMessage = isTv ? "Oznaczono jako obejrzany serial" : "Oznaczono jako obejrzany";
      toast.success(nextWatched ? watchedMessage : "Cofnięto obejrzenie");
    },
    [findMovie, updateMovie, toast]
  );

  const updateNotes = useCallback(
    async (id: string, notes: string): Promise<void> => {
      const movie = findMovie(id);
      if (!movie) return;
      await updateMovie({ ...movie, notes }, { silent: true });
      toast.success("Zapisano notatki");
    },
    [findMovie, updateMovie, toast]
  );

  /** Postęp serialu – zapis cichy, bo użytkownik klika go wielokrotnie. */
  const updateProgress = useCallback(
    async (id: string, season: number, episode: number): Promise<void> => {
      const movie = findMovie(id);
      if (!movie) return;
      const maxSeason = movie.seasons_count && movie.seasons_count > 0 ? movie.seasons_count : Number.POSITIVE_INFINITY;
      const s = Math.min(Math.max(1, Math.round(season)), maxSeason);
      const e = Math.max(0, Math.round(episode));
      await updateMovie({ ...movie, progress_season: s, progress_episode: e }, { silent: true });
    },
    [findMovie, updateMovie]
  );

  /** Pobiera aktualne dane z TMDB (nowe sezony, status, ocena, platformy). Notatki i postęp zostają. */
  const refreshFromTmdb = useCallback(
    async (id: string): Promise<void> => {
      const movie = findMovie(id);
      if (!movie?.tmdb_id) return;
      const mediaType = movie.media_type ?? "movie";
      try {
        const details = await fetchMediaDetails(mediaType, movie.tmdb_id);
        const fresh = buildMovieData(
          {
            tmdbId: movie.tmdb_id, mediaType, title: movie.title, year: movie.release_year ?? null,
            rating: movie.rating, overview: movie.description ?? "", posterPath: movie.poster_path ?? null, genreIds: [],
          },
          details
        );
        const previousSeasons = movie.seasons_count ?? 0;
        await updateMovie(
          {
            ...movie,
            rating: fresh.rating,
            platform: fresh.platform ?? movie.platform,
            genre: movie.genre || fresh.genre,
            description: movie.description || fresh.description,
            poster_path: fresh.poster_path ?? movie.poster_path ?? null,
            release_year: fresh.release_year ?? movie.release_year ?? null,
            seasons_count: fresh.seasons_count,
            episodes_count: fresh.episodes_count,
            series_status: fresh.series_status,
          },
          { silent: true }
        );
        const newSeasons = (fresh.seasons_count ?? 0) - previousSeasons;
        toast.success(
          mediaType === "tv" && previousSeasons > 0 && newSeasons > 0
            ? `Nowe sezony: +${newSeasons}`
            : "Odświeżono dane z TMDB"
        );
      } catch {
        toast.error("Nie udało się odświeżyć danych z TMDB");
      }
    },
    [findMovie, updateMovie, toast]
  );

  const refresh = useCallback(async () => { await crud.refetch(); }, [crud]);

  return {
    movies: crud.items,
    loading: crud.loading,
    fetching: crud.fetching,
    addMovie,
    updateMovie,
    deleteMovie,
    toggleWatched,
    updateNotes,
    updateProgress,
    refreshFromTmdb,
    refresh,
  };
}
