// components/Notes/NoteList.tsx
"use client";
import React, { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Note } from "../../types";
import { useNotes } from "../../hooks/useNotes";
import SearchBar from "../SearchBar";
import NoteCard from "./NoteCard";
import NoteEditForm from "./NoteEditForm";
import { sortNotes, filterNotes, getNoteTitles, exportNoteToPDF } from "../../lib/notesUtils";

interface NoteListProps {
  notes: Note[];
  onNotesChange: () => void;
}

const COLOR_MAP: { [key: string]: string } = {
  "zinc-50": "bg-zinc-50",
  "yellow-100": "bg-yellow-100",
  "green-100": "bg-green-100",
  "cyan-100": "bg-cyan-100",
  "red-100": "bg-red-100",
};

export default function NoteList({ notes, onNotesChange }: NoteListProps) {
  const { deleteNote, editNote, togglePin, toggleArchive } = useNotes();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedNote, setEditedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Sort notes: pinned → regular → archived (each group sorted by updated_at)
  const sortedNotes = useMemo(() => sortNotes(notes), [notes]);

  // Filter notes by search query
  const filteredNotes = useMemo(
    () => filterNotes(sortedNotes, searchQuery),
    [sortedNotes, searchQuery]
  );

  // Get suggestions for autocomplete (all unique titles)
  const suggestions = useMemo(() => getNoteTitles(notes), [notes]);

  // Calculate results label
  const resultsLabel = useMemo(() => {
    const count = filteredNotes.length;
    if (count === 0) return "Nie znaleziono notatek";
    if (count === 1) return "Znaleziono: 1 notatkę";
    if (count < 5) return `Znaleziono: ${count} notatki`;
    return `Znaleziono: ${count} notatek`;
  }, [filteredNotes.length]);

  // Handlers
  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę notatkę?")) return;
    await deleteNote(id);
    onNotesChange();
  };

  const handleEdit = (note: Note) => {
    setEditingId(note.id);
    setEditedNote({ ...note });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedNote(null);
  };

  const handleSaveEdit = async (note: Note) => {
    await editNote(note);
    setEditingId(null);
    setEditedNote(null);
    onNotesChange();
  };

  const handleTogglePin = async (id: string) => {
    await togglePin(id);
    onNotesChange();
  };

  const handleToggleArchive = async (id: string) => {
    await toggleArchive(id);
    onNotesChange();
  };

  const handleExportPDF = async (note: Note) => {
    await exportNoteToPDF(note);
  };

  return (
    <div>
      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Szukaj notatek…"
        suggestions={suggestions}
        resultsCount={searchQuery ? filteredNotes.length : undefined}
        resultsLabel={searchQuery ? resultsLabel : undefined}
        storageKey="notes-search"
        className="mb-6 max-w-md"
      />

      {/* Notes Grid */}
      <ul className="columns-1 sm:columns-2 lg:columns-3 gap-4 mx-auto w-full">
        {filteredNotes.map((note) => {
          const isEditing = editingId === note.id;

          if (isEditing && editedNote) {
            return (
              <NoteEditForm
                key={note.id}
                note={editedNote}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
                onChange={setEditedNote}
                colorMap={COLOR_MAP}
              />
            );
          }

          return (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
              onToggleArchive={handleToggleArchive}
              onExportPDF={handleExportPDF}
              colorMap={COLOR_MAP}
            />
          );
        })}
      </ul>

      {/* Empty state */}
      {filteredNotes.length === 0 && searchQuery && (
        <div className="text-center py-12 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nie znaleziono notatek pasujących do "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
}