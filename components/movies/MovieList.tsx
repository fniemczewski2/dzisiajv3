"use client";

import React, { useState, useMemo } from "react";
import { Loader2, Search } from "lucide-react";
import { useMovies } from "../../hooks/useMovies";
import { useSettings } from "../../hooks/useSettings";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";
import { AddButton } from "../CommonButtons";
import SearchBar from "../SearchBar";
import MovieAddForm, { type NewMovieData } from "./MovieForm";
import MovieCard from "./MovieCard";
import NoResultsState from "../NoResultsState";
import type { Movie, MovieInsert } from "../../types";
import LoadingState from "../LoadingState";

interface MoviesProps {
  movies: Movie[];
  addMovie: (movie: Omit<MovieInsert, "user_id">)=> Promise<Movie>;
  updateMovie: (movie: Movie) => Promise<void>;
  deleteMovie: (id: string) => Promise<void>;
  toggleWatched: (id: string) => Promise<void>;
  updateNotes: (id: string, notes: string) => Promise<void>;
  loading: boolean;
}

export default function MovieWatchlist({
  movies, loading, addMovie, updateMovie, deleteMovie, toggleWatched, updateNotes
}: MoviesProps) {
  
  const { settings } = useSettings();
  const { toast } = useToast();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const retryOpts = { userId: user?.id };

  const sortedMovies = useMemo(() => {
    const sortType = settings?.sort_movies || "updated_desc";
    const sortFn = (a: Movie, b: Movie) => {
      if (sortType === "alphabetical") return a.title.localeCompare(b.title, "pl");
      if (sortType === "rating") {
        const diff = (b.rating ?? -1) - (a.rating ?? -1);
        if (diff !== 0) return diff;
      }
      return (
        new Date(b.updated_at || b.created_at || 0).getTime() -
        new Date(a.updated_at || a.created_at || 0).getTime()
      );
    };
    return [
      ...movies.filter((m) => !m.watched).sort(sortFn),
      ...movies.filter((m) => m.watched).sort(sortFn),
    ];
  }, [movies, settings?.sort_movies]);

  const filteredMovies = useMemo(() => {
    if (!searchQuery.trim()) return sortedMovies;
    const q = searchQuery.toLowerCase();
    return sortedMovies.filter(
      (m) => m.title.toLowerCase().includes(q) ||
        m.genre?.toLowerCase().includes(q) ||
        m.platform?.toLowerCase().includes(q)
    );
  }, [sortedMovies, searchQuery]);

  const suggestions = useMemo(
    () => Array.from(new Set(movies.map((m) => m.title))).sort(),
    [movies]
  );

  const resultsLabel = useMemo(() => {
    const n = filteredMovies.length;
    if (n === 1) return "Znaleziono: 1 film";
    if (n < 5) return `Znaleziono: ${n} filmy`;
    return `Znaleziono: ${n} filmów`;
  }, [filteredMovies.length]);

  const handleAddMovie = async (movieData: NewMovieData) => {
    await withRetry(
      () => addMovie({ ...movieData, watched: false, notes: "" }),
      toast,
      { context: "MovieList.addMovie", ...retryOpts }
    );
    toast.success("Dodano pomyślnie.");
    setShowAddForm(false);
  };

  const handleToggleWatched = async (id: string) => {
    await withRetry(
      () => toggleWatched(id),
      toast,
      { context: "MovieList.toggleWatched", ...retryOpts }
    );
    toast.success("Zmieniono pomyślnie.");
  };

  const handleDelete = async (id: string) => {
    await withRetry(
      () => deleteMovie(id),
      toast,
      { context: "MovieList.deleteMovie", ...retryOpts }
    );
  };

  const handleUpdate = async (movie: Movie) => {
    await withRetry(
      () => updateMovie(movie),
      toast,
      { context: "MovieList.updateMovie", ...retryOpts }
    );
  };

  const handleSaveNotes = async (movieId: string, notes: string) => {
    await withRetry(
      () => updateNotes(movieId, notes),
      toast,
      { context: "MovieList.updateNotes", ...retryOpts }
    );
  };

  const toggleNotes = (movieId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      next.has(movieId) ? next.delete(movieId) : next.add(movieId);
      return next;
    });
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6 mt-2">
        <h2 className="text-2xl font-bold text-text">Filmy</h2>
        {!showAddForm && <AddButton onClick={() => setShowAddForm(true)} type="button" />}
      </div>

      {showAddForm && (
        <div className="mb-8">
          <MovieAddForm
            onSubmit={handleAddMovie}
            onCancel={() => setShowAddForm(false)}
            loading={loading}
          />
        </div>
      )}

      <SearchBar
        value={searchQuery} onChange={setSearchQuery}
        placeholder="Szukaj po tytule, gatunku lub platformie..."
        suggestions={suggestions}
        resultsCount={searchQuery ? filteredMovies.length : undefined}
        resultsLabel={searchQuery ? resultsLabel : undefined}
        className="mb-8"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMovies.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-surface border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
            {searchQuery ? (
              <>
                <Search className="w-12 h-12 mx-auto mb-4 text-textMuted opacity-50" />
                <NoResultsState text="filmów" isSearch />
              </>
            ) : (
              <NoResultsState text="filmów" />
            )}
          </div>
        ) : (
          filteredMovies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onToggleWatched={() => handleToggleWatched(movie.id)}
              onDelete={() => handleDelete(movie.id)}
              onUpdate={handleUpdate}
              expandedNotes={expandedNotes}
              toggleNotes={toggleNotes}
              onSaveNotes={handleSaveNotes}
            />
          ))
        )}
      </div>
    </>
  );
}