"use client";

import React, { useState } from "react";
import { Film, Star, Tv, ChevronDown, ChevronUp } from "lucide-react";
import type { Movie } from "../../types";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";
import { EditButton, DeleteButton, SaveButton, WatchButton, UnwatchButton, FormButtons } from "../CommonButtons";

interface MovieCardProps {
  movie: Movie;
  onToggleWatched: () => void;
  onDelete: () => Promise<void>;
  onUpdate: (movie: Movie) => Promise<void>;
  expandedNotes: Set<string>;
  toggleNotes: (id: string) => void;
  onSaveNotes: (id: string, notes: string) => Promise<void>;
  loading: boolean;
}

export default function MovieCard({
  movie,
  onToggleWatched,
  onDelete,
  onUpdate,
  expandedNotes,
  toggleNotes,
  onSaveNotes,
  loading,
}: MovieCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: movie.title,
    genre: movie.genre || "",
    rating: movie.rating?.toString() || "",
    platform: movie.platform || "",
    description: movie.description || "",
  });
  const [notesText, setNotesText] = useState(movie.notes || "");
  const [showDescription, setShowDescription] = useState(false);

  const retryOpts = { userId: user?.id };

  const handleSaveEdit = async () => {
    const normalizedRating = editForm.rating.replace(",", ".");
    await withRetry(
      async () => {
        await onUpdate({
          ...movie,
          title: editForm.title,
          genre: editForm.genre || null,
          rating: normalizedRating ? parseFloat(normalizedRating) : null,
          platform: editForm.platform || null,
          description: editForm.description || null,
        });
      },
      toast,
      { context: "MovieCard.onUpdate", ...retryOpts }
    );
    toast.success("Zmieniono pomyślnie.");
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditForm({
      title: movie.title,
      genre: movie.genre || "",
      rating: movie.rating?.toString() || "",
      platform: movie.platform || "",
      description: movie.description || "",
    });
    setIsEditing(false);
  };

  const handleSaveNotes = async () => {
    await withRetry(
      async () => { await onSaveNotes(movie.id, notesText); },
      toast,
      { context: "MovieCard.onSaveNotes", ...retryOpts }
    );
    toast.success("Zmieniono pomyślnie.");
  };

  const handleDelete = async () => {
    const ok = await toast.confirm(`Czy na pewno chcesz usunąć film "${movie.title}"?`);
    if (!ok) return;
    await withRetry(
      async () => { await onDelete(); },
      toast,
      { context: "MovieCard.onDelete", ...retryOpts }
    );
    toast.success("Usunięto pomyślnie.");
  };

  return (
    <div className={`p-4 rounded-xl border transition-all duration-200 group ${
      movie.watched
        ? "bg-surface border-gray-200 dark:border-gray-800 opacity-60 grayscale-[0.3]"
        : "card shadow-sm hover:shadow-md hover:border-primary dark:hover:border-primary-dark/50"
    }`}>
      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="form-label">Tytuł:</label>
            <input type="text" value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="input-field font-medium" placeholder="Tytuł filmu" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Gatunek:</label>
              <input type="text" value={editForm.genre}
                onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })}
                className="input-field" placeholder="Np. Dramat" />
            </div>
            <div>
              <label className="form-label">Ocena (0-10):</label>
              <input type="text" inputMode="decimal" value={editForm.rating}
                onChange={(e) => setEditForm({ ...editForm, rating: e.target.value })}
                className="input-field" placeholder="7.5" />
            </div>
          </div>
          <div>
            <label className="form-label">Dostępność (Platforma):</label>
            <input type="text" value={editForm.platform}
              onChange={(e) => setEditForm({ ...editForm, platform: e.target.value })}
              className="input-field" placeholder="Np. Netflix, Kino" />
          </div>
          <div>
            <label className="form-label">Opis:</label>
            <textarea value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="input-field" rows={3} placeholder="Krótki opis..." />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <FormButtons onClickSave={handleSaveEdit} onClickClose={handleCancelEdit} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex-1">
            <h3 className={`text-lg font-bold leading-tight mb-3 break-words ${movie.watched ? "line-through text-textMuted" : "text-text"}`}>
              {movie.title}
            </h3>
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mb-3">
              {movie.rating && (
                <span className="flex items-center text-xs font-bold text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-md">
                  <Star className="w-3.5 h-3.5 mr-1 fill-current" />
                  {movie.rating.toFixed(1)}
                </span>
              )}
              {movie.genre && (
                <span className="flex items-center text-xs font-bold uppercase tracking-wider text-textSecondary bg-surface border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-md">
                  <Film className="w-3.5 h-3.5 mr-1 text-primary" />
                  {movie.genre}
                </span>
              )}
              {movie.platform && (
                <span className="flex items-center text-xs font-bold uppercase tracking-wider text-textSecondary bg-surface border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-md">
                  <Tv className="w-3.5 h-3.5 mr-1 text-primary" />
                  {movie.platform}
                </span>
              )}
            </div>
            {movie.description && (
              <div className="mt-2 mb-2">
                <button onClick={() => setShowDescription(!showDescription)}
                  className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary transition-colors">
                  Opis
                  {showDescription ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showDescription && (
                  <p className="mt-1.5 text-xs text-textSecondary leading-relaxed bg-surface p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                    {movie.description}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="pt-2 border-gray-100 dark:border-gray-800">
            <button onClick={() => toggleNotes(movie.id)}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-textMuted hover:text-text transition-colors mb-3">
              Notatki
              {expandedNotes.has(movie.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedNotes.has(movie.id) && (
              <div className="mb-3">
                <textarea value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  className="input-field text-sm" rows={2}
                  placeholder="Dodaj swoje notatki o filmie..." />
                <div className="flex justify-end mt-2">
                  <SaveButton onClick={handleSaveNotes} />
                </div>
              </div>
            )}
            <div className="flex justify-between w-full gap-1 pt-1 mt-auto">
              {!movie.watched ? (
                <WatchButton onClick={onToggleWatched} />
              ) : (
                <UnwatchButton onClick={onToggleWatched} />
              )}
              <EditButton onClick={() => setIsEditing(true)} />
              <DeleteButton onClick={handleDelete} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}