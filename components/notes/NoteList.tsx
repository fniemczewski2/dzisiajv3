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

// Aktualizacja: Złożone klasy wspierające Tryb Jasny i Ciemny
const COLOR_MAP: { [key: string]: string } = {
  "zinc-50": "bg-zinc-50 dark:bg-card border-gray-200 dark:border-gray-700",
  "yellow-100": "bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700/30",
  "green-100": "bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-700/30",
  "cyan-100": "bg-cyan-100 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-700/30",
  "red-100": "bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-700/30",
};

export default function NoteList({ notes, onNotesChange }: NoteListProps) {
  const { deleteNote, editNote, togglePin, toggleArchive } = useNotes();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedNote, setEditedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const sortedNotes = useMemo(() => sortNotes(notes), [notes]);
  const filteredNotes = useMemo(() => filterNotes(sortedNotes, searchQuery), [sortedNotes, searchQuery]);
  const suggestions = useMemo(() => getNoteTitles(notes), [notes]);

  const resultsLabel = useMemo(() => {
    const count = filteredNotes.length;
    if (count === 0) return "Nie znaleziono notatek";
    if (count === 1) return "Znaleziono: 1 notatkę";
    if (count < 5) return `Znaleziono: ${count} notatki`;
    return `Znaleziono: ${count} notatek`;
  }, [filteredNotes.length]);

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
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Szukaj w notatkach…"
        suggestions={suggestions}
        resultsCount={searchQuery ? filteredNotes.length : undefined}
        resultsLabel={searchQuery ? resultsLabel : undefined}
        storageKey="notes-search"
        className="mb-6 max-w-md"
      />

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

      {filteredNotes.length === 0 && searchQuery && (
        <div className="text-center py-16 bg-surface border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl mt-4">
          <Search className="w-12 h-12 mx-auto mb-4 text-textMuted opacity-50" />
          <p className="text-textSecondary font-medium">
            Nie znaleziono notatek pasujących do "{searchQuery}"
          </p>
        </div>
      )}
    </div>
  );
}