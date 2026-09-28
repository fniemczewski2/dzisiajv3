// components/movies/MovieList.tsx

import React, { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { useSettings } from "@/hooks/db/useSettings";
import { AddButton } from "../ui/CommonButtons";
import SearchBar from "../ui/SearchBar";
import MovieAddForm from "./MovieForm";
import MovieCard from "./MovieCard";
import NoResultsState from "../ui/NoResultsState";
import type { MediaType, Movie, NewMovieData } from "@/types/movies";

interface MoviesProps {
  movies: Movie[];
  addMovie: (movie: NewMovieData) => Promise<boolean>;
  updateMovie: (movie: Movie) => Promise<void>;
  deleteMovie: (id: string) => Promise<void>;
  toggleWatched: (id: string) => Promise<void>;
  updateNotes: (id: string, notes: string) => Promise<void>;
  updateProgress: (id: string, season: number, episode: number) => Promise<void>;
  refreshFromTmdb: (id: string) => Promise<void>;
  loading: boolean;
}

type TypeFilter = MediaType | "all";

const typeOf = (m: Movie): MediaType => m.media_type ?? "movie";

function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  const last = n % 10;
  const lastTwo = n % 100;
  return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many;
}

export function sortMovies(movies: readonly Movie[], sortType: string | undefined): Movie[] {
  const sort = sortType || "updated_desc";
  const byDate = (a: Movie, b: Movie) =>
    new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime();
  const sortFn = (a: Movie, b: Movie) => {
    if (sort === "alphabetical") return a.title.localeCompare(b.title, "pl");
    if (sort === "rating") {
      const diff = (b.rating ?? -1) - (a.rating ?? -1);
      if (diff !== 0) return diff;
    }
    return byDate(a, b);
  };
  return [
    ...movies.filter((m) => !m.watched).sort(sortFn),
    ...movies.filter((m) => m.watched).sort(sortFn),
  ];
}

export default function MovieWatchlist({
  movies, loading, addMovie, updateMovie, deleteMovie, toggleWatched, updateNotes, updateProgress, refreshFromTmdb,
}: Readonly<MoviesProps>) {
  const { settings } = useSettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const counts = useMemo(() => {
    const tv = movies.filter((m) => typeOf(m) === "tv").length;
    return { all: movies.length, movie: movies.length - tv, tv };
  }, [movies]);

  const sortedMovies = useMemo(() => sortMovies(movies, settings?.sort_movies), [movies, settings?.sort_movies]);

  const filteredMovies = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase("pl");
    return sortedMovies.filter((m) => {
      if (typeFilter !== "all" && typeOf(m) !== typeFilter) return false;
      if (!q) return true;
      return (
        m.title.toLocaleLowerCase("pl").includes(q) ||
        (m.genre ?? "").toLocaleLowerCase("pl").includes(q) ||
        (m.platform ?? "").toLocaleLowerCase("pl").includes(q)
      );
    });
  }, [sortedMovies, searchQuery, typeFilter]);

  const suggestions = useMemo(
    () => Array.from(new Set(movies.map((m) => m.title))).sort((a, b) => a.localeCompare(b, "pl")),
    [movies]
  );

  const resultsLabel = `Znaleziono: ${filteredMovies.length} ${plural(filteredMovies.length, "pozycję", "pozycje", "pozycji")}`;

  const handleAddMovie = async (data: NewMovieData): Promise<boolean> => {
    const ok = await addMovie(data);
    if (ok) setShowAddForm(false);
    return ok;
  };

  const toggleNotes = (movieId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(movieId)) next.delete(movieId);
      else next.add(movieId);
      return next;
    });
  };

  const tabs: { value: TypeFilter; label: string; count: number }[] = [
    { value: "all", label: "Wszystko", count: counts.all },
    { value: "movie", label: "Filmy", count: counts.movie },
    { value: "tv", label: "Seriale", count: counts.tv },
  ];

  const emptyText = typeFilter === "tv" ? "seriali" : typeFilter === "movie" ? "filmów" : "filmów ani seriali";
  const isFiltering = searchQuery.trim().length > 0;

  return (
    <>
      <div className="flex justify-between items-center mb-6 mt-2">
        <h2 className="text-2xl font-bold text-text">Filmy i seriale</h2>
        {!showAddForm && <AddButton onClick={() => setShowAddForm(true)} />}
      </div>

      {showAddForm && (
        <div className="mb-8">
          <MovieAddForm onSubmit={handleAddMovie} onCancel={() => setShowAddForm(false)} loading={loading} />
        </div>
      )}

      <div role="tablist" aria-label="Rodzaj" className="flex gap-1.5 mb-4 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.value} type="button" role="tab" aria-selected={typeFilter === t.value}
            onClick={() => setTypeFilter(t.value)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-bold border whitespace-nowrap transition-colors ${
              typeFilter === t.value
                ? "bg-primary text-white border-primary"
                : "bg-surface text-textSecondary border-gray-200 dark:border-gray-700 hover:text-text"
            }`}>
            {t.label} <span className={typeFilter === t.value ? "opacity-80" : "text-textMuted"}>{t.count}</span>
          </button>
        ))}
      </div>

      <SearchBar
        value={searchQuery} onChange={setSearchQuery}
        placeholder="Szukaj po tytule, gatunku lub platformie..."
        suggestions={suggestions}
        resultsCount={isFiltering ? filteredMovies.length : undefined}
        resultsLabel={isFiltering ? resultsLabel : undefined}
        className="mb-8"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMovies.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-surface border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
            {isFiltering && <Search className="w-12 h-12 mx-auto mb-4 text-textMuted opacity-50" />}
            <NoResultsState text={emptyText} isSearch={isFiltering} />
          </div>
        ) : (
          filteredMovies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onToggleWatched={() => toggleWatched(movie.id)}
              onDelete={() => deleteMovie(movie.id)}
              onUpdate={updateMovie}
              onProgress={(s, e) => updateProgress(movie.id, s, e)}
              onRefresh={() => refreshFromTmdb(movie.id)}
              expandedNotes={expandedNotes}
              toggleNotes={toggleNotes}
              onSaveNotes={updateNotes}
              loading={loading}
            />
          ))
        )}
      </div>
    </>
  );
}
