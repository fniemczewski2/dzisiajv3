// pages/notes/movies.tsx

import React from "react";
import MovieWatchlist from "@/components/movies/MovieList";
import { SkeletonList } from "@/components/ui/Skeleton";
import { useMovies } from "@/hooks/db/useMovies";
import Seo from "@/components/ui/SEO";

export default function MoviesPage() {
  const { movies, fetching, loading, addMovie, updateMovie, deleteMovie, toggleWatched, updateNotes, updateProgress, refreshFromTmdb } = useMovies();

  return (
    <>
      <Seo
        title="Filmy i seriale"
        description="Wyszukuj tytuły w bazie TMDB, zapisuj filmy i seriale do obejrzenia, oceniaj obejrzane i śledź postęp sezonów."
        canonical="https://dzisiaj.fun/notes/movies"
        keywords="filmy, seriale, do obejrzenia, watchlist, recenzje filmowe"
      />
      {fetching && movies.length === 0
        ? <SkeletonList count={4} variant="movie" />
        : <MovieWatchlist
            movies={movies}
            addMovie={addMovie}
            updateMovie={updateMovie}
            deleteMovie={deleteMovie}
            toggleWatched={toggleWatched}
            updateNotes={updateNotes}
            updateProgress={updateProgress}
            refreshFromTmdb={refreshFromTmdb}
            loading={loading}
          />
      }
    </>
  );
}
