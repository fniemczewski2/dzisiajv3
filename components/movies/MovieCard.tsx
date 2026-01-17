// components/Movies/MovieCard.tsx
"use client";
import React, { useState } from "react";
import { Film, Star, Tv, Check, ChevronDown, ChevronUp, Save, Pen, Pencil, X, Eye, NotepadText } from "lucide-react";
import type { Movie } from "../../types";
import { EditButton, DeleteButton, SaveButton, CancelButton } from "../CommonButtons";

interface MovieCardProps {
  movie: Movie;
  onToggleWatched: () => void;
  onDelete: () => void;
  onUpdate: (id: string, updates: Partial<Movie>) => void;
  expandedNotes: Set<string>;
  toggleNotes: (id: string) => void;
  onSaveNotes: (id: string, notes: string) => void;
}

export default function MovieCard({
  movie,
  onToggleWatched,
  onDelete,
  onUpdate,
  expandedNotes,
  toggleNotes,
  onSaveNotes,
}: MovieCardProps) {
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

  const handleSaveEdit = async () => {
    // Normalize rating - accept both comma and dot as decimal separator
    let normalizedRating = editForm.rating.replace(",", ".");
    
    await onUpdate(movie.id, {
      title: editForm.title,
      genre: editForm.genre || null,
      rating: normalizedRating ? parseFloat(normalizedRating) : null,
      platform: editForm.platform || null,
      description: editForm.description || null,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    // Reset form to original values
    setEditForm({
      title: movie.title,
      genre: movie.genre || "",
      rating: movie.rating?.toString() || "",
      platform: movie.platform || "",
      description: movie.description || "",
    });
    setIsEditing(false);
  };

  const handleSaveNotes = () => {
    onSaveNotes(movie.id, notesText);
  };

  const handleDelete = () => {
    if (confirm(`Czy na pewno chcesz usunąć film "${movie.title}"?`)) {
      onDelete();
    }
  };

  const handleRatingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow both comma and dot for decimal separator while typing
    const value = e.target.value;
    setEditForm({ ...editForm, rating: value });
  };

  return (
    <div
      className={`p-4 border rounded-xl transition-all ${
        movie.watched
          ? "bg-gray-50 border-gray-200 opacity-75"
          : "bg-white border-gray-300 shadow-sm hover:shadow-md"
      }`}
    >
      {isEditing ? (
        // Edit mode
        <div className="space-y-3">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Tytuł:
            </label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              placeholder="Tytuł filmu"
            />
          </div>

          {/* Genre and Rating */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Gatunek:
              </label>
              <input
                type="text"
                value={editForm.genre}
                onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                placeholder="Np. Dramat"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Ocena (0-10):
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={editForm.rating}
                onChange={handleRatingChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                placeholder="7.5 lub 7,5"
              />
            </div>
          </div>

          {/* Platform */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Dostępność:
            </label>
            <input
              type="text"
              value={editForm.platform}
              onChange={(e) => setEditForm({ ...editForm, platform: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              placeholder="Np. Netflix, HBO Max"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Opis:
            </label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              rows={3}
              placeholder="Krótki opis filmu..."
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <SaveButton onClick={handleSaveEdit} type="button" />
            <CancelButton onCancel={handleCancelEdit} />
          </div>
        </div>
      ) : (
        // Normal mode
        <>
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-start flex-nowrap gap-2">
                
                <h3
                    className={`text-lg w-full font-semibold h-full ${
                      movie.watched ? "line-through text-gray-500" : "text-gray-900"
                    }`}
                  >
                    {movie.title}
                </h3>
                <div className="flex gap-1">
                  
                  <button
                    onClick={onToggleWatched}
                    className={`flex flex-col px-1.5 items-center justify-center rounded-lg text-green-600 hover:text-green-800 transition-colors
                    ${!movie.watched
                      ? "text-green-600 hover:text-green-800"
                      : "text-primary hover:text-secondary"
                    }`}
                    aria-label={movie.watched ? "Oznacz jako nieobejrzany" : "Oznacz jako obejrzany"}
                  >
                    {!movie.watched ? <Check className="w-5 h-5 sm:w-6 sm:h-6" /> : <Eye className="w-5 h-5 sm:w-6 sm:h-6" />}
                    <span className="text-[9px] sm:text-[11px]">{!movie.watched ? "Obejrzane" : "Obejrzyj"}</span>
                  </button>
                  <EditButton onClick={() => setIsEditing(true)} />
                  <DeleteButton onClick={handleDelete} />
                </div>
              </div>
              <div className="flex flex-col text-xs text-gray-700 items-start mt-4 space-y-1.5 mb-2">
                    <span className="flex items-center gap-1">
                    {movie.rating && (
                        <p className="flex flex-nowrap mr-2 text-yellow-600">
                          <Star className="w-4 h-4 mr-1 flex-shrink-0" />
                          {movie.rating.toFixed(1)}
                        </p>
                    )}
                    {movie.genre && (
                        <p className="flex flex-nowrap mr-2 text-gray-600">
                            <Film className="w-4 h-4 mr-1 flex-shrink-0" />
                            {movie.genre}
                        </p>
                    )}
                    {movie.platform && (
                        <p className="flex items-center text-xs gap-1">
                            <Tv className="w-4 h-4 mr-1 flex-shrink-0" />
                            {movie.platform}
                        </p>
                    )}
                    </span>

                      {/* Collapsible Description */}
                      {movie.description && (

                          <button
                            onClick={() => setShowDescription(!showDescription)}
                            className="flex items-center gap-1 mt-3 text-xs text-primary hover:text-secondary hover:underline transition-colors"
                          >
                            
                            {showDescription ? (
                              <>
                              Zwiń...&nbsp;
                              </>
                            ) : (
                              <>
                              Więcej...&nbsp;
                              </>
                            )}
                            
                          </button>
                      )}
                      {(movie.description && showDescription) && (
                        <p className="mt-1 text-sm font-normal text-gray-600 leading-relaxed">
                          {movie.description}
                        </p>
                      )}

              </div>
            </div>
          </div>

          {/* Notes section */}
          <div className="mt-1 pt-3 border-t border-gray-200">
            <button
              onClick={() => toggleNotes(movie.id)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Notatki
              {expandedNotes.has(movie.id) ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {expandedNotes.has(movie.id) && (
              <div className="mt-2">
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  rows={3}
                  placeholder="Dodaj swoje notatki o filmie..."
                />
                  <SaveButton onClick={handleSaveNotes}/>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}