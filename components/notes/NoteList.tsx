"use client";
import React, { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { Edit2, Trash2, Save, X } from "lucide-react";
import { Note } from "../../types";
import { useNotes } from "../../hooks/useNotes";

interface NoteListProps {
  notes: Note[];
}

const COLOR_MAP: { [key: string]: string } = {
  "zinc-50": "bg-zinc-50",
  "yellow-100": "bg-yellow-100",
  "green-100": "bg-green-100",
  "cyan-100": "bg-cyan-100",
  "red-100": "bg-red-100",
};

export default function NoteList({ notes }: NoteListProps) {
  const { deleteNote, editNote } = useNotes();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedNote, setEditedNote] = useState<Note | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<HTMLTextAreaElement>(null);

  const tailwindColors = Object.keys(COLOR_MAP);

  // Autofocus title field in edit mode
  useEffect(() => {
    if (editingId && titleRef.current) {
      titleRef.current.focus();
    }
  }, [editingId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę notatkę?")) return;
    await deleteNote(id);
  };

  const handleEdit = (note: Note) => {
    setEditingId(note.id);
    setEditedNote({ ...note });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedNote(null);
  };

  // --- Normalization helpers (same as NoteForm) ---
  const normalizeItem = (line: string) => {
    let cleaned = line.trim();

    // Autolink URL
    const urlRegex = /^(https?:\/\/)?([\w.-]+\.[a-z]{2,})(\/\S*)?$/i;
    if (urlRegex.test(cleaned)) {
      if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
        cleaned = "https://" + cleaned;
      }
    }

    return cleaned;
  };

  const normalizeItemsFromTextarea = () => {
    if (!itemsRef.current) return editedNote?.items ?? [];
    return itemsRef.current.value
      .split("\n")
      .map((line) => normalizeItem(line))
      .filter(Boolean);
  };

  const handleSaveEdit = async () => {
    if (!editedNote) return;

    const normalizedItems = normalizeItemsFromTextarea();

    await editNote({
      ...editedNote,
      items: normalizedItems,
    });

    setEditingId(null);
    setEditedNote(null);
  };

  // Render clickable links inside notes
  const renderWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;

    return text.split(urlRegex).map((part, i) => {
      if (!part) return null;

      if (urlRegex.test(part)) {
        let href = part;
        if (!href.startsWith("http")) href = "https://" + href;

        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            {part}
          </a>
        );
      }

      return <span key={i}>{part}</span>;
    });
  };

  return (
    <ul className="flex flex-wrap justify-center">
      {notes.map((n) => {
        const isEditing = editingId === n.id;

        // --- Edit mode ---
        if (isEditing && editedNote) {
          return (
            <li
              key={n.id}
              className="bg-gray-50 border-2 border-gray-300 py-2 px-4 sm:py-4 my-2 sm:m-4 max-w-sm min-w-[300px] rounded-xl shadow-lg flex flex-col"
            >
              <div className="space-y-3">
                {/* Title */}
                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    Tytuł:
                  </label>
                  <input
                    ref={titleRef}
                    type="text"
                    value={editedNote.title}
                    onChange={(e) =>
                      setEditedNote({ ...editedNote, title: e.target.value })
                    }
                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Items */}
                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    Treść:
                  </label>
                  <textarea
                    ref={itemsRef}
                    defaultValue={editedNote.items.join("\n")}
                    placeholder="Pozycje listy (jeden element na linię)"
                    className="w-full mt-1 p-2 border rounded-lg h-28 focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Color Picker */}
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-semibold text-gray-700">
                    Kolor:
                  </span>
                  {tailwindColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() =>
                        setEditedNote({ ...editedNote, bg_color: color })
                      }
                      className={clsx(
                        "w-6 h-6 rounded-full border-2 transition",
                        editedNote.bg_color === color
                          ? "border-secondary ring-2 ring-secondary"
                          : "border-transparent hover:border-gray-400",
                        COLOR_MAP[color]
                      )}
                    />
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    <span className="text-sm">Zapisz</span>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span className="text-sm">Anuluj</span>
                  </button>
                </div>
              </div>
            </li>
          );
        }

        // --- View mode ---
        return (
          <li
            key={n.id}
            className={clsx(
              "py-2 px-4 sm:py-4 my-2 sm:m-4 max-w-sm min-w-[300px] rounded-xl shadow flex flex-col justify-between hover:shadow-lg transition",
              COLOR_MAP[n.bg_color] || "bg-zinc-50"
            )}
          >
            <h3 className="font-semibold text-lg mb-2">{n.title}</h3>

            <ul className="list-disc pl-5 mb-4 space-y-1">
              {n.items.map((it, i) => (
                <li key={i} className="text-gray-800">
                  {renderWithLinks(it)}
                </li>
              ))}
            </ul>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => handleEdit(n)}
                className="flex flex-col items-center text-primary hover:text-secondary transition-colors"
                title="Edytuj"
              >
                <Edit2 className="w-5 h-5" />
                <span className="text-xs mt-1">Edytuj</span>
              </button>
              <button
                onClick={() => handleDelete(n.id)}
                className="flex flex-col items-center text-red-500 hover:text-red-600 transition-colors"
                title="Usuń"
              >
                <Trash2 className="w-5 h-5" />
                <span className="text-xs mt-1">Usuń</span>
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
