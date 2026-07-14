import { useState, useEffect, useCallback, useMemo } from "react";
import type { Movie, MovieInsert } from "@/types/movies";
import { useAuth } from "@/providers/AuthProvider";
import { useSettings } from "./useSettings";
import { useToast } from "@/providers/ToastProvider";

export function useMovies() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { settings } = useSettings();

  const [rawMovies, setRawMovies] = useState<Movie[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  useEffect(() => {
    let toastId: string | undefined;
    if (fetching  && toast.loading) toastId = toast.loading("Ładowanie filmów...");
    return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [fetching, toast]);

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
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
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
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("movies")
        .insert({ ...movie, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      try {
        setRawMovies((prev) => [data, ...prev]);
        return data;
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId]
  );

  const updateMovie = useCallback(
    async (movie: Movie): Promise<void> => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      try { 
        const { id, ...updates } = movie;
        const { error } = await supabase.from("movies").update(updates).eq("id", id);
        if (error) throw error;
        setRawMovies((prev) => prev.map((m) => (m.id === id ? movie : m)));
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const deleteMovie = useCallback(
    async (id: string): Promise<void> => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      const ok = await toast.confirm(
        `Czy chcesz usunąć film?`
      );
      if (!ok) return;
      setLoading(true);
      try { 
        const { error } = await supabase.from("movies").delete().eq("id", id);
        if (error) throw error;
        setRawMovies((prev) => prev.filter((m) => m.id !== id));
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const toggleWatched = useCallback(
    async (id: string): Promise<void> => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
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
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
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