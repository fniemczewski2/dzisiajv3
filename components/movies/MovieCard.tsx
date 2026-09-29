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

const chip = "flex items-center text-xs font-bold text-text-secondary bg-surface border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-md";

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
  movie, onToggleWatched, onDelete, onUpdate, onProgress, onRefresh,
  expandedNotes, toggleNotes, onSaveNotes, loading,
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
      ...(toTv ? {} : { seasons_count: null, episodes_count: null, series_status: null, progress_season: null, progress_episode: null }),
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditForm(toEditForm(movie));
    setIsEditing(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  };

  const editPrefix = `edit-movie-${movie.id}`;

  if (isEditing) {
    return (
      <div className="p-4 rounded-xl border card shadow-sm">
        <div className="space-y-4">
          <div>
            <label htmlFor={`${editPrefix}-title`} className="form-label">Tytuł:</label>
            <input id={`${editPrefix}-title`} type="text" value={editForm.title} maxLength={300}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="input-field font-medium" placeholder={`Tytuł ${noun}`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${editPrefix}-type`} className="form-label">Typ:</label>
              <select id={`${editPrefix}-type`} value={editForm.mediaType}
                onChange={(e) => setEditForm({ ...editForm, mediaType: e.target.value as MediaType })} className="input-field">
                <option value="movie">Film</option>
                <option value="tv">Serial</option>
              </select>
            </div>
            <div>
              <label htmlFor={`${editPrefix}-rating`} className="form-label">Ocena (0-10):</label>
              <input id={`${editPrefix}-rating`} type="text" inputMode="decimal" value={editForm.rating}
                onChange={(e) => setEditForm({ ...editForm, rating: e.target.value })} className="input-field" placeholder="7.5" />
            </div>
          </div>
          <div>
            <label htmlFor={`${editPrefix}-genre`} className="form-label">Gatunek:</label>
            <input id={`${editPrefix}-genre`} type="text" value={editForm.genre} maxLength={200}
              onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })} className="input-field" placeholder="Np. Dramat" />
          </div>
          <div>
            <label htmlFor={`${editPrefix}-platform`} className="form-label">Dostępność (Platforma):</label>
            <input id={`${editPrefix}-platform`} type="text" value={editForm.platform} maxLength={300}
              onChange={(e) => setEditForm({ ...editForm, platform: e.target.value })} className="input-field" placeholder="Np. Netflix, Kino" />
          </div>
          <div>
            <label htmlFor={`${editPrefix}-desc`} className="form-label">Opis:</label>
            <textarea id={`${editPrefix}-desc`} value={editForm.description} maxLength={5000}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="input-field" rows={3} placeholder="Krótki opis..." />
          </div>
          <FormButtons onClickSave={handleSaveEdit} onClickClose={handleCancelEdit} loading={loading} />
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl border transition-all duration-200 group ${
      movie.watched
        ? "bg-surface border-gray-200 dark:border-gray-800 opacity-60 grayscale-[0.3]"
        : "card shadow-sm hover:shadow-md hover:border-primary dark:hover:border-primary/50"
    }`}>
      <div className="flex flex-col h-full">
        <div className="flex-1">
          <div className="flex gap-3 mb-3">
            {poster && (
              <Image src={poster} alt="" width={56} height={84} loading="lazy"
                className="w-14 h-21 object-cover rounded-md shadow-sm shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="mb-1.5"><MediaTypeBadge type={type} /></div>
              <h3 className={`text-lg font-bold leading-tight break-words ${movie.watched ? "line-through text-text-muted" : "text-text"}`}>
                {movie.title}
                {movie.release_year && <span className="font-normal text-text-muted text-base"> ({movie.release_year})</span>}
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            {movie.rating != null && movie.rating > 0 && (
              <span className="flex items-center text-xs font-bold text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-md">
                <Star className="w-3.5 h-3.5 mr-1 fill-current" />
                {movie.rating.toFixed(1)}
              </span>
            )}
            {isTv && movie.seasons_count ? (
              <span className={chip}>
                <Layers className="w-3.5 h-3.5 mr-1 text-primary" />
                {movie.seasons_count} {pluralSeasons(movie.seasons_count)}
                {movie.episodes_count ? ` · ${movie.episodes_count} odc.` : ""}
              </span>
            ) : null}
            {isTv && movie.series_status && (
              <span className={chip}>
                <CalendarDays className="w-3.5 h-3.5 mr-1 text-primary" />
                {movie.series_status}
              </span>
            )}
            {movie.genre && (
              <span className={chip}>
                <Film className="w-3.5 h-3.5 mr-1 text-primary" />
                {movie.genre}
              </span>
            )}
            {movie.platform && (
              <span className={chip}>
                <Tv className="w-3.5 h-3.5 mr-1 text-primary" />
                {movie.platform}
              </span>
            )}
          </div>

          {isTv && !movie.watched && (
            <SeriesProgress
              season={movie.progress_season}
              episode={movie.progress_episode}
              seasonsCount={movie.seasons_count}
              onChange={(s, e) => { void onProgress(s, e); }}
              disabled={loading}
            />
          )}

          {movie.description && (
            <div className="mt-2 mb-2">
              <button onClick={() => setShowDescription(!showDescription)} type="button" aria-expanded={showDescription}
                className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-strong transition-colors">
                Opis
                {showDescription ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showDescription && (
                <p className="mt-1.5 text-xs text-text-secondary leading-relaxed bg-surface p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 whitespace-pre-wrap">
                  {movie.description}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="pt-2 border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => toggleNotes(movie.id)} aria-expanded={expandedNotes.has(movie.id)}
              className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text transition-colors">
              Notatki
              {expandedNotes.has(movie.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {movie.tmdb_id && (
              <button type="button" onClick={handleRefresh} disabled={refreshing || loading}
                title={isTv ? "Pobierz nowe sezony, status i dostępność z TMDB" : "Odśwież ocenę i dostępność z TMDB"} aria-label={isTv ? "Pobierz nowe sezony, status i dostępność z TMDB" : "Odśwież ocenę i dostępność z TMDB"}
                className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text transition-colors disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Odśwież
              </button>
            )}
          </div>
          {expandedNotes.has(movie.id) && (
            <div className="mb-3">
              <label htmlFor={`notes-${movie.id}`} className="sr-only">Notatki do {noun}</label>
              <textarea id={`notes-${movie.id}`} value={notesText} onChange={(e) => setNotesText(e.target.value)}
                className="input-field text-sm" rows={2} placeholder={`Dodaj swoje notatki o ${isTv ? "serialu" : "filmie"}...`} />
              <div className="flex justify-end mt-2">
                <SaveButton onClick={() => onSaveNotes(movie.id, notesText)} />
              </div>
            </div>
          )}
          <div className="flex justify-between w-full gap-1 pt-1 mt-auto">
            {movie.watched ? <UnwatchButton onClick={onToggleWatched} /> : <WatchButton onClick={onToggleWatched} />}
            <EditButton onClick={() => setIsEditing(true)} />
            <DeleteButton onClick={() => onDelete()} />
          </div>
        </div>
      </div>
    </div>
  );
}
