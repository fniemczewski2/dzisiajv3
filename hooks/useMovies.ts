// hooks/useMovies.ts
import { useState, useEffect, useCallback } from "react";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";
import type { Movie, MovieInsert, MovieUpdate } from "../types";

interface UseMoviesReturn {
  movies: Movie[];
  loading: boolean;
  error: string | null;
  addMovie: (movie: Omit<MovieInsert, "user_id">) => Promise<Movie | null>;
  updateMovie: (id: string, updates: Partial<Movie>) => Promise<boolean>;
  deleteMovie: (id: string) => Promise<boolean>;
  toggleWatched: (id: string) => Promise<boolean>;
  updateNotes: (id: string, notes: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useMovies(): UseMoviesReturn {
  const supabase = useSupabaseClient();
  const session = useSession();
  const userId = session?.user?.id;

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pobierz filmy z bazy danych
  const fetchMovies = useCallback(async () => {
    if (!userId) {
      setMovies([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .eq("user_id", userId)
        .order("rating", { ascending: false, nullsFirst: false });

      if (error) throw error;

      setMovies(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd podczas ładowania filmów");
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  // Automatyczne ładowanie przy montowaniu komponentu
  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  // Dodaj nowy film
  const addMovie = useCallback(
    async (movie: Omit<MovieInsert, "user_id">) => {
      if (!userId) return null;

      try {
        const { data, error } = await supabase
          .from("movies")
          .insert({
            ...movie,
            user_id: userId,
          })
          .select()
          .single();

        if (error) throw error;

        setMovies((prev) => [data, ...prev]);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Błąd podczas dodawania filmu");
        return null;
      }
    },
    [supabase, userId]
  );

  // Aktualizuj film
  const updateMovie = useCallback(
    async (id: string, updates: Partial<Movie>) => {
      try {
        const { error } = await supabase
          .from("movies")
          .update(updates)
          .eq("id", id);

        if (error) throw error;

        setMovies((prev) =>
          prev.map((movie) =>
            movie.id === id ? { ...movie, ...updates } : movie
          )
        );
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Błąd podczas aktualizacji filmu");
        return false;
      }
    },
    [supabase, userId]
  );

  // Usuń film
  const deleteMovie = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase
          .from("movies")
          .delete()
          .eq("id", id)


        if (error) throw error;

        setMovies((prev) => prev.filter((movie) => movie.id !== id));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Błąd podczas usuwania filmu");
        return false;
      }
    },
    [supabase, userId]
  );

  // Przełącz status obejrzenia
  const toggleWatched = useCallback(
    async (id: string) => {
      const movie = movies.find((m) => m.id === id);
      if (!movie) return false;

      return updateMovie(id, { watched: !movie.watched });
    },
    [movies, updateMovie]
  );

  // Zaktualizuj notatki
  const updateNotes = useCallback(
    async (id: string, notes: string) => {
      return updateMovie(id, { notes });
    },
    [updateMovie]
  );

  // Odśwież listę filmów
  const refresh = useCallback(async () => {
    await fetchMovies();
  }, [fetchMovies]);

  return {
    movies,
    loading,
    error,
    addMovie,
    updateMovie,
    deleteMovie,
    toggleWatched,
    updateNotes,
    refresh,
  };
}