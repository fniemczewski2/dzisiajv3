// pages/movies.tsx
import React, { useEffect } from "react";
import MovieWatchlist from "../../components/movies/MovieList";
import { useMovies } from "../../hooks/useMovies";
import { useToast } from "../../providers/ToastProvider";
import Seo from "../../components/SEO";

export default function MoviesPage() {
  const { movies, fetching, loading, addMovie, updateMovie, deleteMovie, toggleWatched, updateNotes } = useMovies();
  const { toast } = useToast();

  useEffect(() => {
      let toastId: string | undefined;
      
      if (fetching && toast.loading) {
        toastId = toast.loading("Ładowanie filmów...");
      }
  
      return () => {
        if (toastId && toast.dismiss) {
          toast.dismiss(toastId);
        }
      };
  }, [fetching, toast]);
  
  return (
    <>
      <Seo
        title="Filmy i Seriale - Dzisiaj v3"
        description="Kataloguj produkcje do obejrzenia, wystawiaj oceny i twórz swoją prywatną filmotekę."
        canonical="https://dzisiajv3.vercel.app/notes/movies"
        keywords="filmy, seriale, do obejrzenia, watchlist, recenzje filmowe"
      />
      <MovieWatchlist movies={movies} addMovie={addMovie} updateMovie={updateMovie} deleteMovie={deleteMovie} toggleWatched={toggleWatched} updateNotes={updateNotes} loading={loading}/>
    </>
  );
}