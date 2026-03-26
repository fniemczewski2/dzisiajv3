// pages/movies.tsx
import React, { useEffect } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import MovieWatchlist from "../../components/movies/MovieList";
import { useMovies } from "../../hooks/useMovies";
import { useToast } from "../../providers/ToastProvider";

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
      <Head>
        <title>Filmy - Dzisiaj</title>
        <meta name="description" content="Zarządzaj swoją listą filmów do obejrzenia" />
        <link rel="canonical" href="https://dzisiajv3.vercel.app/movies" />
        <meta property="og:title" content="Moja lista filmów – Dzisiaj" />
        <meta
          property="og:description"
          content="Śledź filmy do obejrzenia, oceny i notatki"
        />
      </Head>

      <Layout>
        <MovieWatchlist movies={movies} addMovie={addMovie} updateMovie={updateMovie} deleteMovie={deleteMovie} toggleWatched={toggleWatched} updateNotes={updateNotes} loading={loading}/>
      </Layout>
    </>
  );
}