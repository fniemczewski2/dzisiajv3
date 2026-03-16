// hooks/useMovies.ts

import { useState, useEffect, useCallback } from "react";
import type { Movie, MovieInsert } from "../types";
import { useAuth } from "../providers/AuthProvider";

export function useMovies() {
  const { user, supabase } = useAuth();
  const userId = user?.id;

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMovies = useCallback(async () => {
    if (!userId) { setMovies([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .eq("user_id", userId)
        .order("rating", { ascending: false, nullsFirst: false });
      if (error) throw error;
      setMovies(data || []);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => { fetchMovies(); }, [fetchMovies]);

  /** Throws on error — caller: withRetry + toast.success("Dodano pomyślnie.") */
  const addMovie = useCallback(
    async (movie: Omit<MovieInsert, "user_id">): Promise<Movie> => {
      if (!userId) throw new Error("Musisz być zalogowany");
      const { data, error } = await supabase
        .from("movies")
        .insert({ ...movie, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      setMovies((prev) => [data, ...prev]);
      return data;
    },
    [supabase, userId]
  );

  /**
   * Accepts a full Movie object (matches MovieList.tsx calling convention).
   * Throws on error — caller: withRetry + toast.success("Zmieniono pomyślnie.")
   */
  const updateMovie = useCallback(
    async (movie: Movie): Promise<void> => {
      const { id, ...updates } = movie;
      const { error } = await supabase.from("movies").update(updates).eq("id", id);
      if (error) throw error;
      setMovies((prev) => prev.map((m) => (m.id === id ? movie : m)));
    },
    [supabase]
  );

  const deleteMovie = useCallback(
    async (id: string): Promise<void> => {
      const { error } = await supabase.from("movies").delete().eq("id", id);
      if (error) throw error;
      setMovies((prev) => prev.filter((m) => m.id !== id));
    },
    [supabase]
  );

  /** Throws on error — caller: withRetry + toast.success("Zmieniono pomyślnie.") */
  const toggleWatched = useCallback(
    async (id: string): Promise<void> => {
      const movie = movies.find((m) => m.id === id);
      if (!movie) return;
      await updateMovie({ ...movie, watched: !movie.watched });
    },
    [movies, updateMovie]
  );

  /** Throws on error — caller: withRetry + toast.success("Zmieniono pomyślnie.") */
  const updateNotes = useCallback(
    async (id: string, notes: string): Promise<void> => {
      const movie = movies.find((m) => m.id === id);
      if (!movie) return;
      await updateMovie({ ...movie, notes });
    },
    [movies, updateMovie]
  );

  const refresh = useCallback(async () => { await fetchMovies(); }, [fetchMovies]);

  return { movies, loading, addMovie, updateMovie, deleteMovie, toggleWatched, updateNotes, refresh };
}