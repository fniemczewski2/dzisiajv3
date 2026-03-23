import { useState, useEffect, useCallback, useMemo } from "react";
import type { Movie, MovieInsert } from "../types";
import { useAuth } from "../providers/AuthProvider";
import { useSettings } from "./useSettings";

export function useMovies() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { settings } = useSettings();

  const [rawMovies, setRawMovies] = useState<Movie[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  const movies = useMemo(() => {
    if (!settings) return rawMovies;
    const sorted = [...rawMovies];
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
  }, [rawMovies, settings?.sort_movies]);

  const fetchMovies = useCallback(async () => {
    if (!userId) {
      setRawMovies([]);
      setLoading(false);
      return;
    }
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      setRawMovies(data || []);
    } finally {
      setFetching(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  const addMovie = useCallback(
    async (movie: Omit<MovieInsert, "user_id">): Promise<Movie> => {
      if (!userId) throw new Error("Musisz być zalogowany");
      setLoading(true);
      const { data, error } = await supabase
        .from("movies")
        .insert({ ...movie, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      try {
        setRawMovies((prev) => [data, ...prev]);
      } finally {
        setLoading(false);
        return data;
      }
    },
    [supabase, userId]
  );

  const updateMovie = useCallback(
    async (movie: Movie): Promise<void> => {
      setLoading(true);
      const { id, ...updates } = movie;
      const { error } = await supabase.from("movies").update(updates).eq("id", id);
      if (error) throw error;
      try {
        setRawMovies((prev) => prev.map((m) => (m.id === id ? movie : m)));
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const deleteMovie = useCallback(
    async (id: string): Promise<void> => {
      setLoading(true);
      const { error } = await supabase.from("movies").delete().eq("id", id);
      if (error) throw error;
      try {
        setRawMovies((prev) => prev.filter((m) => m.id !== id));
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const toggleWatched = useCallback(
    async (id: string): Promise<void> => {
      setLoading(true);
      const movie = rawMovies.find((m) => m.id === id);
      if (!movie) return;
      try {
        await updateMovie({ ...movie, watched: !movie.watched });
      } finally {
        setLoading(false);
      }
    },
    [rawMovies, updateMovie]
  );

  const updateNotes = useCallback(
    async (id: string, notes: string): Promise<void> => {
      const movie = rawMovies.find((m) => m.id === id);
      if (!movie) return;
      await updateMovie({ ...movie, notes });
    },
    [rawMovies, updateMovie]
  );

  const refresh = useCallback(async () => {
    await fetchMovies();
  }, [fetchMovies]);

  return {
    movies,
    loading,
    fetching,
    addMovie,
    updateMovie,
    deleteMovie,
    toggleWatched,
    updateNotes,
    refresh,
  };
}