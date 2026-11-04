// components/notes/NoteList.tsx

import React, { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Note } from "@/types/notes";
import { useNotes } from "@/hooks/db/useNotes";
import { useSettings } from "@/hooks/db/useSettings";
import SearchBar from "../ui/SearchBar";
import { ToggleChip } from "../ui/CommonButtons";
import { downloadNoteMarkdown } from "@/lib/notes/export";
import { ALL_FOLDERS, folderCounts, folderOptions, matchesFolder, type FolderFilter } from "@/lib/notes/folders";
import NoteCard from "./NoteCard";
import NoteEditForm from "./NoteEditForm";
import { filterNotes, getNoteTitles } from "@/lib/notesUtils";
import NoResultsState from "../ui/NoResultsState";

interface NoteListProps {
  notes: Note[];
  onNotesChange: () => void;
}

export default function NoteList({ notes, onNotesChange }: Readonly<NoteListProps>) {
  const { deleteNote, editNote, togglePin, toggleArchive, loading } = useNotes();
  const { settings } = useSettings();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedNote, setEditedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState<FolderFilter>(ALL_FOLDERS);

  const sortedNotes = useMemo(() => {
    const sortType = settings?.sort_notes || "updated_desc";
    return [...notes].sort((a, b) => {
      if (a.archived !== b.archived) {
        return a.archived ? 1 : -1;
      }

      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }
      if (sortType === "alphabetical") {
        return (a.title || "").localeCompare(b.title || "", "pl");
      }
      return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
    });
  }, [notes, settings?.sort_notes]);

  const folders = useMemo(() => folderOptions(notes), [notes]);
  const counts = useMemo(() => folderCounts(notes), [notes]);
  // Wybrany folder, który już nie istnieje (ostatnia notatka przeniesiona), traktujemy jak „Wszystkie”.
  const activeFilter: FolderFilter =
    folderFilter.kind === "folder" && !folders.includes(folderFilter.folder) ? ALL_FOLDERS : folderFilter;
  const inFolder = useMemo(
    () => sortedNotes.filter((n) => matchesFolder(n, activeFilter)),
    [sortedNotes, activeFilter]
  );
  const filteredNotes = useMemo(() => filterNotes(inFolder, searchQuery), [inFolder, searchQuery]);
  const suggestions = useMemo(() => getNoteTitles(notes), [notes]);

  const resultsLabel = useMemo(() => {
    const n = filteredNotes.length;
    if (n === 0) return "Nie znaleziono notatek";
    if (n === 1) return "Znaleziono: 1 notatkę";
    if (n < 5) return `Znaleziono: ${n} notatki`;
    return `Znaleziono: ${n} notatek`;
  }, [filteredNotes.length]);

  const handleDelete = async (id: string) => {
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

  return (
    <div>
      {folders.length > 0 && (
        <fieldset className="m-0 mb-4 flex min-w-0 flex-wrap gap-2 border-0 p-0">
          <legend className="sr-only">Foldery notatek</legend>
          <ToggleChip
            label={`Wszystkie (${notes.length})`}
            active={activeFilter.kind === "all"}
            onClick={() => setFolderFilter(ALL_FOLDERS)}
          />
          {counts.none > 0 && (
            <ToggleChip
              label={`Bez folderu (${counts.none})`}
              active={activeFilter.kind === "none"}
              onClick={() => setFolderFilter({ kind: "none" })}
            />
          )}
          {folders.map((folder) => (
            <ToggleChip
              key={folder}
              label={`${folder} (${counts.byFolder.get(folder) ?? 0})`}
              active={activeFilter.kind === "folder" && activeFilter.folder === folder}
              onClick={() => setFolderFilter({ kind: "folder", folder })}
            />
          ))}
        </fieldset>
      )}

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Szukaj w notatkach…"
        suggestions={suggestions}
        resultsCount={searchQuery ? filteredNotes.length : undefined}
        resultsLabel={searchQuery ? resultsLabel : undefined}
        className="mb-6 max-w-md"
      />

      <ul className="mx-auto w-full columns-1 gap-4 gap-y-2 sm:columns-2 lg:columns-3">
        {filteredNotes.length === 0 && <NoResultsState text="notatek" />}
        {filteredNotes.map((note) => {
          if (editingId === note.id && editedNote) {
            return (
              <NoteEditForm
                key={note.id}
                note={editedNote}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
                onChange={setEditedNote}
                loading={loading}
                folders={folders}
              />
            );
          }
          return (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={handleEdit}
              onDownload={downloadNoteMarkdown}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
              onToggleArchive={handleToggleArchive}
            />
          );
        })}
      </ul>

      {filteredNotes.length === 0 && searchQuery && (
        <div className="mt-4 rounded-card border border-dashed border-line bg-surface py-16 text-center">
          <Search className="mx-auto mb-4 h-12 w-12 text-text-muted opacity-50" />
          <p className="font-medium text-text-secondary">
            <NoResultsState text="notatek" isSearch />
          </p>
        </div>
      )}
    </div>
  );
}
