// components/movies/MovieCard.tsx

import React, { useState } from "react";
import Image from "next/image";
import { Film, Star, Tv, ChevronDown, ChevronUp, RefreshCw, CalendarDays, Layers } from "lucide-react";
import type { MediaType, Movie } from "@/types/movies";
import { posterUrl } from "@/lib/tmdb";
import { EditButton, DeleteButton, SaveButton, WatchButton, UnwatchButton, FormButtons } from "../ui/CommonButtons";
import { MediaTypeBadge, pluralSeasons } from "./MovieForm";
import SeriesProgress from "./SeriesProgress";

interface MovieCardProps {
  movie: Movie;
  onToggleWatched: () => void;
  onDelete: () => Promise<void>;
  onUpdate: (movie: Movie) => Promise<void>;
  onProgress: (season: number, episode: number) => Promise<void>;
  onRefresh: () => Promise<void>;
  expandedNotes: Set<string>;
  toggleNotes: (id: string) => void;
  onSaveNotes: (id: string, notes: string) => Promise<void>;
  loading: boolean;
}

const chip =
  "flex items-center text-xs font-bold text-text-secondary bg-surface border border-line px-2 py-1 rounded-lg";

function toEditForm(movie: Movie) {
  return {
    title: movie.title,
    genre: movie.genre || "",
    rating: movie.rating?.toString() || "",
    platform: movie.platform || "",
    description: movie.description || "",
    mediaType: (movie.media_type ?? "movie") as MediaType,
  };
}

export default function MovieCard({
  movie,
  onToggleWatched,
  onDelete,
  onUpdate,
  onProgress,
  onRefresh,
  expandedNotes,
  toggleNotes,
  onSaveNotes,
  loading,
}: Readonly<MovieCardProps>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(() => toEditForm(movie));
  const [notesText, setNotesText] = useState(movie.notes || "");
  const [showDescription, setShowDescription] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const type: MediaType = movie.media_type ?? "movie";
  const isTv = type === "tv";
  const poster = posterUrl(movie.poster_path, "w92");
  const noun = isTv ? "serialu" : "filmu";

  const handleSaveEdit = async () => {
    const normalized = editForm.rating.replaceAll(",", ".");
    const rating = normalized ? Number.parseFloat(normalized) : Number.NaN;
    const toTv = editForm.mediaType === "tv";
    await onUpdate({
      ...movie,
      title: editForm.title.trim() || movie.title,
      genre: editForm.genre.trim() || null,
      rating: Number.isFinite(rating) ? Math.min(10, Math.max(0, rating)) : null,
      platform: editForm.platform.trim() || null,
      description: editForm.description.trim() || null,
      media_type: editForm.mediaType,
      ...(toTv
        ? {}
        : {
            seasons_count: null,
            episodes_count: null,
            series_status: null,
            progress_season: null,
            progress_episode: null,
          }),
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditForm(toEditForm(movie));
    setIsEditing(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const editPrefix = `edit-movie-${movie.id}`;

  if (isEditing) {
    return (
      <div className="card rounded-xl border p-4 shadow-sm">
        <div className="space-y-4">
          <div>
            <label htmlFor={`${editPrefix}-title`} className="form-label">
              Tytuł:
            </label>
            <input
              id={`${editPrefix}-title`}
              type="text"
              value={editForm.title}
              maxLength={300}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="input-field font-medium"
              placeholder={`Tytuł ${noun}`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${editPrefix}-type`} className="form-label">
                Typ:
              </label>
              <select
                id={`${editPrefix}-type`}
                value={editForm.mediaType}
                onChange={(e) => setEditForm({ ...editForm, mediaType: e.target.value as MediaType })}
                className="input-field"
              >
                <option value="movie">Film</option>
                <option value="tv">Serial</option>
              </select>
            </div>
            <div>
              <label htmlFor={`${editPrefix}-rating`} className="form-label">
                Ocena (0-10):
              </label>
              <input
                id={`${editPrefix}-rating`}
                type="text"
                inputMode="decimal"
                value={editForm.rating}
                onChange={(e) => setEditForm({ ...editForm, rating: e.target.value })}
                className="input-field"
                placeholder="7.5"
              />
            </div>
          </div>
          <div>
            <label htmlFor={`${editPrefix}-genre`} className="form-label">
              Gatunek:
            </label>
            <input
              id={`${editPrefix}-genre`}
              type="text"
              value={editForm.genre}
              maxLength={200}
              onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })}
              className="input-field"
              placeholder="Np. Dramat"
            />
          </div>
          <div>
            <label htmlFor={`${editPrefix}-platform`} className="form-label">
              Dostępność (Platforma):
            </label>
            <input
              id={`${editPrefix}-platform`}
              type="text"
              value={editForm.platform}
              maxLength={300}
              onChange={(e) => setEditForm({ ...editForm, platform: e.target.value })}
              className="input-field"
              placeholder="Np. Netflix, Kino"
            />
          </div>
          <div>
            <label htmlFor={`${editPrefix}-desc`} className="form-label">
              Opis:
            </label>
            <textarea
              id={`${editPrefix}-desc`}
              value={editForm.description}
              maxLength={5000}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="input-field"
              rows={3}
              placeholder="Krótki opis..."
            />
          </div>
          <FormButtons onClickSave={handleSaveEdit} onClickClose={handleCancelEdit} loading={loading} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group rounded-xl border p-4 transition-all duration-200 ${
        movie.watched
          ? "border-line bg-surface opacity-60 grayscale-[0.3]"
          : "card shadow-sm hover:border-primary hover:shadow-md dark:hover:border-primary/50"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex-1">
          <div className="mb-3 flex gap-3">
            {poster && (
              <Image
                src={poster}
                alt=""
                width={56}
                height={84}
                loading="lazy"
                className="h-21 w-14 shrink-0 rounded-lg object-cover shadow-sm"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="mb-1.5">
                <MediaTypeBadge type={type} />
              </div>
              <h3
                className={`text-lg leading-tight font-bold break-words ${movie.watched ? "text-text-muted line-through" : "text-text"}`}
              >
                {movie.title}
                {movie.release_year && (
                  <span className="text-base font-normal text-text-muted"> ({movie.release_year})</span>
                )}
              </h3>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            {movie.rating != null && movie.rating > 0 && (
              <span className="flex items-center rounded-lg bg-warning-soft px-2 py-1 text-xs font-bold text-warning">
                <Star className="mr-1 h-3.5 w-3.5 fill-current" />
                {movie.rating.toFixed(1)}
              </span>
            )}
            {isTv && movie.seasons_count ? (
              <span className={chip}>
                <Layers className="mr-1 h-3.5 w-3.5 text-primary" />
                {movie.seasons_count} {pluralSeasons(movie.seasons_count)}
                {movie.episodes_count ? ` · ${movie.episodes_count} odc.` : ""}
              </span>
            ) : null}
            {isTv && movie.series_status && (
              <span className={chip}>
                <CalendarDays className="mr-1 h-3.5 w-3.5 text-primary" />
                {movie.series_status}
              </span>
            )}
            {movie.genre && (
              <span className={chip}>
                <Film className="mr-1 h-3.5 w-3.5 text-primary" />
                {movie.genre}
              </span>
            )}
            {movie.platform && (
              <span className={chip}>
                <Tv className="mr-1 h-3.5 w-3.5 text-primary" />
                {movie.platform}
              </span>
            )}
          </div>

          {isTv && !movie.watched && (
            <SeriesProgress
              season={movie.progress_season}
              episode={movie.progress_episode}
              seasonsCount={movie.seasons_count}
              onChange={(s, e) => {
                void onProgress(s, e);
              }}
              disabled={loading}
            />
          )}

          {movie.description && (
            <div className="mt-2 mb-2">
              <button
                onClick={() => setShowDescription(!showDescription)}
                type="button"
                aria-expanded={showDescription}
                className="flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary-strong"
              >
                Opis
                {showDescription ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showDescription && (
                <p className="mt-1.5 rounded-lg border border-line bg-surface p-2.5 text-xs leading-relaxed whitespace-pre-wrap text-text-secondary">
                  {movie.description}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="border-line pt-2">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => toggleNotes(movie.id)}
              aria-expanded={expandedNotes.has(movie.id)}
              className="flex items-center gap-1.5 text-xs font-bold text-text-muted transition-colors hover:text-text"
            >
              Notatki
              {expandedNotes.has(movie.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {movie.tmdb_id && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing || loading}
                title={isTv ? "Pobierz nowe sezony, status i dostępność z TMDB" : "Odśwież ocenę i dostępność z TMDB"}
                aria-label={
                  isTv ? "Pobierz nowe sezony, status i dostępność z TMDB" : "Odśwież ocenę i dostępność z TMDB"
                }
                className="flex items-center gap-1 text-xs font-medium text-text-muted transition-colors hover:text-text disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Odśwież
              </button>
            )}
          </div>
          {expandedNotes.has(movie.id) && (
            <div className="mb-3">
              <label htmlFor={`notes-${movie.id}`} className="sr-only">
                Notatki do {noun}
              </label>
              <textarea
                id={`notes-${movie.id}`}
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                className="input-field text-sm"
                rows={2}
                placeholder={`Dodaj swoje notatki o ${isTv ? "serialu" : "filmie"}...`}
              />
              <div className="mt-2 flex justify-end">
                <SaveButton onClick={() => onSaveNotes(movie.id, notesText)} />
              </div>
            </div>
          )}
          <div className="mt-auto flex w-full justify-between gap-1 pt-1">
            {movie.watched ? <UnwatchButton onClick={onToggleWatched} /> : <WatchButton onClick={onToggleWatched} />}
            <EditButton onClick={() => setIsEditing(true)} />
            <DeleteButton onClick={() => onDelete()} />
          </div>
        </div>
      </div>
    </div>
  );
}
