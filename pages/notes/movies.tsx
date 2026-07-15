// pages/movies.tsx
import React from "react";
import MovieWatchlist from "@/components/movies/MovieList";
import { SkeletonList } from "@/components/ui/Skeleton";
import { useMovies } from "@/hooks/db/useMovies";
import Seo from "@/components/ui/SEO";

export default function MoviesPage() {
  const { movies, fetching, loading, addMovie, updateMovie, deleteMovie, toggleWatched, updateNotes } = useMovies();

  return (
    <>
      <Seo
        title="Filmy i Seriale | Dzisiaj.Fun"
        description="Kataloguj produkcje do obejrzenia, wystawiaj oceny i twórz swoją prywatną filmotekę."
        canonical="https://dzisiaj.fun/notes/movies"
        keywords="filmy, seriale, do obejrzenia, watchlist, recenzje filmowe"
      />
      {fetching
        ? <SkeletonList count={4} variant="movie" />
        : <MovieWatchlist movies={movies} addMovie={addMovie} updateMovie={updateMovie} deleteMovie={deleteMovie} toggleWatched={toggleWatched} updateNotes={updateNotes} loading={loading}/>
      }
    </>
  );
}