"use client";
import React, { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { Pin, Archive, Download, Search } from "lucide-react";
import { Note } from "../../types";
import { useNotes } from "../../hooks/useNotes";
import { formatTime } from "../../lib/dateUtils";
import { EditButton, DeleteButton, SaveButton, CancelButton } from "../CommonButtons";

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

  const titleRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<HTMLTextAreaElement>(null);

  const tailwindColors = Object.keys(COLOR_MAP);

  useEffect(() => {
    if (editingId && titleRef.current) {
      titleRef.current.focus();
    }
  }, [editingId]);

  const filteredNotes = notes.filter((note) => {
    const query = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      note.items.some((item) => item.toLowerCase().includes(query))
    );
  });

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

  const handleTogglePin = async (id: string) => {
    await togglePin(id);
    onNotesChange();
  };

  const handleToggleArchive = async (id: string) => {
    await toggleArchive(id);
    onNotesChange();
  };

  const normalizeItem = (line: string) => {
    let cleaned = line.trim();
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
    onNotesChange();
  };

  const exportToPDF = async (note: Note) => {
    if (typeof window === "undefined") return;

    try {
      const pdfMakeModule = await import("pdfmake/build/pdfmake");
      const pdfFontsModule = await import("pdfmake/build/vfs_fonts");

      const pdfMake = (pdfMakeModule as any).default || pdfMakeModule;
      const pdfFonts = (pdfFontsModule as any).default || pdfFontsModule;

      (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs;

      const docDefinition = {
        content: [
          {
            text: note.title,
            style: "header",
            margin: [0, 0, 0, 20],
          },
          {
            ul: note.items,
            margin: [0, 0, 0, 10],
          },
        ],
        styles: {
          header: {
            fontSize: 24,
            bold: true,
          },
        },
        defaultStyle: {
          font: "Roboto",
          fontSize: 12,
        },
      };

      pdfMake.createPdf(docDefinition).download(
        `${note.title.replace(/\s+/g, "_")}.pdf`
      );
    } catch (error) {
      console.error("Błąd podczas eksportu do PDF:", error);
      alert("Wystąpił błąd podczas eksportu do PDF");
    }
  };

  const renderWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)|((www\.)?[\w-]+\.[a-z]{2,}[^\s]*)/gi;

    return text.split(urlRegex).map((part, i) => {
      if (!part) return null;

      if (/^(https?:\/\/)|((www\.)?[\w-]+\.[a-z]{2,})/i.test(part)) {
        let href = part;
        if (!href.startsWith("http")) {
          href = "https://" + href;
        }

        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-secondary"
          >
            {part}
          </a>
        );
      }

      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div>
      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj notatek…"
            className="flex-1 rounded-xl border pl-10 pr-3 py-2 bg-white"
          />
        </div>
        {searchQuery && (
          <p className="text-sm text-gray-600 mt-2">
            Znaleziono: {filteredNotes.length} {filteredNotes.length === 1 ? "notatkę" : filteredNotes.length < 5 ? "notatki" : "notatek"}
          </p>
        )}
      </div>
      <ul className="columns-1 sm:columns-2 lg:columns-3 gap-4 mx-auto w-full">
        {filteredNotes.map((n) => {
          const isEditing = editingId === n.id;

          if (isEditing && editedNote) {
            return (
              <li
                key={n.id}
                className="break-inside-avoid bg-gray-50 border-2 border-gray-300 py-2 px-4 sm:py-4 my-2 sm:m-4 max-w-sm min-w-[300px] rounded-xl shadow-lg flex flex-col max-h-fit"
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

                  <div className="flex justify-end gap-2 pt-2">
                    <SaveButton onClick={handleSaveEdit} type="button" />
                    <CancelButton onCancel={handleCancelEdit} />
                  </div>
                </div>
              </li>
            );
          }

          return (
            <li
              key={n.id}
              className={clsx(
                "break-inside-avoid py-2 px-4 sm:py-4 my-2 sm:m-4 max-w-sm min-w-[300px] rounded-xl shadow flex flex-col justify-start hover:shadow-lg transition max-h-fit relative",
                COLOR_MAP[n.bg_color] || "bg-zinc-50",
                n.archived && "opacity-60"
              )}
            >
              {n.pinned && (
                <div className="absolute top-2 right-2">
                  <Pin className="w-4 h-4 text-primary fill-primary" />
                </div>
              )}

              {n.archived && (
                <div className="absolute top-2 right-2">
                  <Archive className="w-4 h-4 text-gray-500" />
                </div>
              )}

              <h3 className="font-semibold text-lg mb-2 pr-6">{n.title}</h3>

              <ul className="list-disc pl-5 mb-4 space-y-1">
                {!n.archived && n.items.map((it, i) => (
                  <li key={i} className="text-gray-800">
                    {renderWithLinks(it)}
                  </li>
                ))}
              </ul>

              <div className="relative flex justify-end space-x-2 flex-wrap gap-y-2 mt-4">
                <p className="text-xs text-gray-500 absolute bottom-0 left-0">
                  {n.updated_at && formatTime(n.updated_at, true)}
                </p>
                <button
                  onClick={() => handleTogglePin(n.id)}
                  className={clsx(
                    "flex flex-col items-center transition-colors",
                    n.pinned
                      ? "text-primary"
                      : "text-gray-500 hover:text-primary"
                  )}
                  title={n.pinned ? "Odepnij" : "Przypnij"}
                >
                  <Pin className={clsx("w-4 h-4", n.pinned && "fill-primary")} />
                  <span className="text-[10px] mt-1">
                    {n.pinned ? "Odepnij" : "Przypnij"}
                  </span>
                </button>

                <button
                  onClick={() => handleToggleArchive(n.id)}
                  className={clsx(
                    "flex flex-col items-center transition-colors",
                    n.archived
                      ? "text-gray-700"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                  title={n.archived ? "Przywróć" : "Archiwizuj"}
                >
                  <Archive className="w-4 h-4" />
                  <span className="text-[10px] mt-1">
                    {n.archived ? "Przywróć" : "Archiwum"}
                  </span>
                </button>

                {/* Export Menu */}
                <div className="relative">
                  <button
                    onClick={() => exportToPDF(n)}
                    className="flex flex-col items-center text-gray-500 hover:text-gray-700 transition-colors"
                    title="Eksportuj"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-[10px] mt-1">PDF</span>
                  </button>
                </div>

                <EditButton onClick={() => handleEdit(n)} />

                <DeleteButton onClick={() => handleDelete(n.id)} />
              </div>
            </li>
          );
        })}
      </ul>

      {filteredNotes.length === 0 && searchQuery && (
        <div className="text-center py-12 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nie znaleziono notatek pasujących do "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
}