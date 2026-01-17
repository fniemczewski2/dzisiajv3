// components/Movies/MovieWatchlist.tsx
"use client";
import React, { useState, useMemo } from "react";
import { Loader2, Search } from "lucide-react";
import { useMovies } from "../../hooks/useMovies";
import type { Movie } from "../../types";
import { AddButton } from "../CommonButtons";
import SearchBar from "../SearchBar";
import MovieAddForm, { type NewMovieData } from "./MovieForm";
import MovieCard from "./MovieCard";

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

  // Sort movies: unwatched by rating (desc) → watched by rating (desc)
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

  // Filter movies by search query
  const filteredMovies = useMemo(() => {
    if (!searchQuery.trim()) return sortedMovies;

    const query = searchQuery.toLowerCase();
    return sortedMovies.filter((movie) =>
      movie.title.toLowerCase().includes(query) ||
      movie.genre?.toLowerCase().includes(query) ||
      movie.platform?.toLowerCase().includes(query)
    );
  }, [sortedMovies, searchQuery]);

  // Get suggestions for autocomplete (unique titles)
  const suggestions = useMemo(() => {
    const titles = movies.map((m) => m.title);
    return Array.from(new Set(titles)).sort();
  }, [movies]);

  // Calculate results label
  const resultsLabel = useMemo(() => {
    const count = filteredMovies.length;
    if (count === 1) return "Znaleziono: 1 film";
    if (count < 5) return `Znaleziono: ${count} filmy`;
    return `Znaleziono: ${count} filmów`;
  }, [filteredMovies.length]);

  // Handlers
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Filmy</h2>
        {!showAddForm && (
          <AddButton onClick={() => setShowAddForm(true)} type="button" />
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <MovieAddForm
          onSubmit={handleAddMovie}
          onCancel={() => setShowAddForm(false)}
          loading={loading}
        />
      )}

      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Szukaj filmów po tytule, gatunku lub platformie..."
        suggestions={suggestions}
        resultsCount={searchQuery ? filteredMovies.length : undefined}
        resultsLabel={searchQuery ? resultsLabel : undefined}
        storageKey="movies-search"
        className="mb-6"
      />

      {/* Movies list */}
      <div className="space-y-3">
        {filteredMovies.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchQuery ? (
              <>
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nie znaleziono filmów pasujących do "{searchQuery}"</p>
              </>
            ) : (
              <p>Brak filmów na liście. Dodaj pierwszy!</p>
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