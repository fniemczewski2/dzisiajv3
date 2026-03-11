"use client";
import React, { useState, useMemo } from "react";
import { Loader2, Search } from "lucide-react";
import { useMovies } from "../../hooks/useMovies";
import { AddButton } from "../CommonButtons";
import SearchBar from "../SearchBar";
import MovieAddForm, { type NewMovieData } from "./MovieForm";
import MovieCard from "./MovieCard";
import NoResultsState from "../NoResultsState";

export default function MovieWatchlist() {
  const {
    movies,
    loading,
    error,
    addMovie,
    updateMovie,
    deleteMovie,
    toggleWatched,
    updateNotes,
  } = useMovies();

  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const sortedMovies = useMemo(() => {
    const unwatched = movies
      .filter((m) => !m.watched)
      .sort((a, b) => {
        if (a.rating === null) return 1;
        if (b.rating === null) return -1;
        return b.rating - a.rating;
      });

    const watched = movies
      .filter((m) => m.watched)
      .sort((a, b) => {
        if (a.rating === null) return 1;
        if (b.rating === null) return -1;
        return b.rating - a.rating;
      });

    return [...unwatched, ...watched];
  }, [movies]);

  const filteredMovies = useMemo(() => {
    if (!searchQuery.trim()) return sortedMovies;
    const query = searchQuery.toLowerCase();
    return sortedMovies.filter((movie) =>
      movie.title.toLowerCase().includes(query) ||
      movie.genre?.toLowerCase().includes(query) ||
      movie.platform?.toLowerCase().includes(query)
    );
  }, [sortedMovies, searchQuery]);

  const suggestions = useMemo(() => {
    const titles = movies.map((m) => m.title);
    return Array.from(new Set(titles)).sort();
  }, [movies]);

  const resultsLabel = useMemo(() => {
    const count = filteredMovies.length;
    if (count === 1) return "Znaleziono: 1 film";
    if (count < 5) return `Znaleziono: ${count} filmy`;
    return `Znaleziono: ${count} filmów`;
  }, [filteredMovies.length]);

  const handleAddMovie = async (movieData: NewMovieData) => {
    const result = await addMovie({
      ...movieData,
      watched: false,
      notes: "",
    });

    if (result) {
      setShowAddForm(false);
    }
  };

  const toggleNotes = (movieId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(movieId)) {
        next.delete(movieId);
      } else {
        next.add(movieId);
      }
      return next;
    });
  };

  const handleSaveNotes = async (movieId: string, notes: string) => {
    await updateNotes(movieId, notes);
  };

  if (loading && movies.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6 mt-2">
        <h2 className="text-2xl font-bold text-text">Filmy</h2>
        {!showAddForm && (
          <AddButton onClick={() => setShowAddForm(true)} type="button" />
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 font-medium">
          {error}
        </div>
      )}

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
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Szukaj po tytule, gatunku lub platformie..."
        suggestions={suggestions}
        resultsCount={searchQuery ? filteredMovies.length : undefined}
        resultsLabel={searchQuery ? resultsLabel : undefined}
        storageKey="movies-search"
        className="mb-8"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMovies.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-surface border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
            {searchQuery ? (
              <>
                <Search className="w-12 h-12 mx-auto mb-4 text-textMuted opacity-50" />
                <p className="text-textSecondary font-medium">Nie znaleziono filmów pasujących do "{searchQuery}"</p>
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
              onToggleWatched={() => toggleWatched(movie.id)}
              onDelete={() => deleteMovie(movie.id)}
              onUpdate={updateMovie}
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