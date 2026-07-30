// hooks/db/useMovies.ts

import { useCallback, useMemo } from "react";
import type { Movie, MovieInsert } from "@/types/movies";
import { useSettings } from "./useSettings";
import { useToast } from "@/providers/ToastProvider";
import { useCrudResource } from "./useCrudResource";

const MESSAGES = {
  fetchError: "Błąd pobierania filmów.",
  added: "Dodano film",
  addError: "Błąd dodawania filmu.",
  edited: "Zaktualizowano film",
  editError: "Błąd aktualizacji filmu.",
  deleted: "Usunięto film",
  deleteError: "Błąd usuwania filmu.",
  confirmDelete: "Czy chcesz usunąć film?",
};

export function useMovies() {
  const { settings } = useSettings();
  const { toast } = useToast();
  const crud = useCrudResource<Movie, MovieInsert>({
    table: "movies",
    insertPosition: "start",
    messages: MESSAGES,
  });

  const movies = useMemo(() => {
    if (!settings) return crud.items;
    const sorted = [...crud.items];
    if (settings.sort_movies === "rating") {
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (settings.sort_movies === "alphabetical") {
      sorted.sort((a, b) => (a.title || "").localeCompare(b.title || "", "pl"));
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at || 0).getTime() -
          new Date(a.updated_at || a.created_at || 0).getTime()
      );
    }
    return sorted;
  }, [crud.items, settings]);

  const updateMovie = useCallback(
    async (movie: Movie, options: { silent?: boolean } = {}): Promise<void> => {
      const { id, ...updates } = movie;
      await crud.patch(id, updates, {
        silent: options.silent,
        successMessage: MESSAGES.edited,
        errorMessage: MESSAGES.editError,
      });
    },
    [crud]
  );

  const deleteMovie = useCallback(
    async (id: string): Promise<void> => {
      await crud.remove(id);
    },
    [crud]
  );

  const toggleWatched = useCallback(
    async (id: string): Promise<void> => {
      const movie = crud.items.find((m) => m.id === id);
      if (!movie) return;
      const nextWatched = !movie.watched;
      await updateMovie({ ...movie, watched: nextWatched }, { silent: true });
      toast.success(nextWatched ? "Oznaczono jako obejrzany" : "Cofnięto obejrzenie");
    },
    [crud.items, updateMovie, toast]
  );

  const updateNotes = useCallback(
    async (id: string, notes: string): Promise<void> => {
      const movie = crud.items.find((m) => m.id === id);
      if (!movie) return;
      await updateMovie({ ...movie, notes }, { silent: true });
    },
    [crud.items, updateMovie]
  );

  const refresh = useCallback(async () => {
    await crud.refetch();
  }, [crud]);

  return {
    movies,
    loading: crud.loading,
    fetching: crud.fetching,
    addMovie: crud.add,
    updateMovie,
    deleteMovie,
    toggleWatched,
    updateNotes,
    refresh,
  };
}
