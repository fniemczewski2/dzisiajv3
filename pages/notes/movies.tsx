// pages/movies.tsx
import React, { useState } from "react";
import Head from "next/head";
import { useSession } from "@supabase/auth-helpers-react";
import { Loader2 } from "lucide-react";
import Layout from "../../components/Layout";
import MovieWatchlist from "../../components/movies/MovieList";
import LoadingState from "../../components/LoadingState";
import { useMovies } from "../../hooks/useMovies";

export default function MoviesPage() {
  const { loading } = useMovies();
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
        {(loading) && <LoadingState />}
        <MovieWatchlist />
      </Layout>
    </>
  );
}