import { useState, useEffect, useCallback, useMemo } from "react";
import type { Movie, MovieInsert } from "@/types/movies";
import { useAuth } from "@/providers/AuthProvider";
import { useSettings } from "./useSettings";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";

export function useMovies() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { settings } = useSettings();

  const [rawMovies, setRawMovies] = useState<Movie[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const withRetry = useRetry();

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

      throw new Error("Unauthorized");
    }
    setFetching(true);
    try {
      const { data, error } = await withRetry(async () =>
        supabase.from("movies").select("*").eq("user_id", userId)
      );
      if (error) throw error;
      setRawMovies(data || []);
    } catch {
      toast.error("Błąd pobierania filmów.");
    } finally {
      setFetching(false);
    }
  }, [supabase, userId, toast, withRetry]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  const addMovie = useCallback(
    async (movie: MovieInsert) => {
      if (!userId) {
  
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const tempId = `temp-${Date.now()}`;
      const optimisticMovie = { ...movie, id: tempId, user_id: userId } as Movie;
      setRawMovies((prev) => [optimisticMovie, ...prev]);

      try {
        const { data, error } = await withRetry(async () =>
          supabase.from("movies").insert({ ...movie, user_id: userId }).select().single()
        );
        if (error) throw error;

        setRawMovies((prev) => prev.map((m) => (m.id === tempId ? (data as Movie) : m)));
        toast.success("Dodano film");
        return data as Movie;
      } catch {
        setRawMovies((prev) => prev.filter((m) => m.id !== tempId));
        toast.error("Błąd dodawania filmu.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, toast, withRetry]
  );

  const updateMovie = useCallback(
    async (movie: Movie, options: { silent?: boolean } = {}): Promise<void> => {
      if (!userId) {
  
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const previous = rawMovies;
      const { id, ...updates } = movie;
      setRawMovies((prev) => prev.map((m) => (m.id === id ? movie : m)));

      try {
        const { error } = await withRetry(async () => supabase.from("movies").update(updates).eq("id", id));
        if (error) throw error;
        if (!options.silent) toast.success("Zaktualizowano film");
      } catch {
        setRawMovies(previous);
        toast.error("Błąd aktualizacji filmu.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, rawMovies, toast, withRetry]
  );

  const deleteMovie = useCallback(
    async (id: string): Promise<void> => {
      if (!userId) {
  
        throw new Error("Unauthorized");
      }
      const ok = await toast.confirm(`Czy chcesz usunąć film?`);
      if (!ok) return;

      setLoading(true);
      const previous = rawMovies;
      setRawMovies((prev) => prev.filter((m) => m.id !== id));

      try {
        const { error } = await withRetry(async () => supabase.from("movies").delete().eq("id", id));
        if (error) throw error;
        toast.success("Usunięto film");
      } catch {
        setRawMovies(previous);
        toast.error("Błąd usuwania filmu.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, rawMovies, toast, withRetry]
  );

  const toggleWatched = useCallback(
    async (id: string): Promise<void> => {
      const movie = rawMovies.find((m) => m.id === id);
      if (!movie) return;
      const nextWatched = !movie.watched;
      await updateMovie({ ...movie, watched: nextWatched }, { silent: true });
      toast.success(nextWatched ? "Oznaczono jako obejrzany" : "Cofnięto obejrzenie");
    },
    [rawMovies, updateMovie, toast]
  );

  const updateNotes = useCallback(
    async (id: string, notes: string): Promise<void> => {
      const movie = rawMovies.find((m) => m.id === id);
      if (!movie) return;
      await updateMovie({ ...movie, notes }, { silent: true });
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
