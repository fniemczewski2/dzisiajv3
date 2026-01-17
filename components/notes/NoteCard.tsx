// components/Notes/NoteCard.tsx
"use client";
import React from "react";
import clsx from "clsx";
import { Pin, Archive, Download } from "lucide-react";
import { Note } from "../../types";
import { formatTime } from "../../lib/dateUtils";
import { DeleteButton, EditButton } from "../CommonButtons";

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onExportPDF: (note: Note) => void;
  colorMap: { [key: string]: string };
}

export default function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleArchive,
  onExportPDF,
  colorMap,
}: NoteCardProps) {
  const renderWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)|((www\.)?[\w-]+\.[a-z]{2,}[^\s]*)/gi;

    return text.split(urlRegex).map((part, i) => {
      if (!part) return null;

      if (/^(https?:\/\/)|((www\.)?[\w-]+\.[a-z]{2,})/i.test(part)) {
        let href = part;
        let displayText = part;

        // Add https:// if missing
        if (!href.startsWith("http")) {
          href = "https://" + href;
        }

        // Remove https:// and www. from display text
        displayText = displayText.replace(/^https?:\/\//, "").replace(/^www\./, "");

        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-secondary"
          >
            {displayText}
          </a>
        );
      }

      return <span key={i}>{part}</span>;
    });
  };

  return (
    <li
      className={clsx(
        "break-inside-avoid py-2 px-4 sm:py-4 my-2 sm:m-4 max-w-sm min-w-[300px] rounded-xl shadow flex flex-col justify-start hover:shadow-lg transition max-h-fit relative",
        colorMap[note.bg_color] || "bg-zinc-50",
        note.archived && "opacity-60"
      )}
    >
      {/* Pin or Archive indicator */}
      {note.pinned && !note.archived && (
        <div className="absolute top-2 right-2">
          <Pin className="w-5 h-5 sm:w-6 sm:h-6 text-primary fill-primary" />
        </div>
      )}

      {note.archived && (
        <div className="absolute top-2 right-2">
          <Archive className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
        </div>
      )}

      {/* Title */}
      <h3 className="font-semibold text-lg mb-2 pr-6">{note.title}</h3>

      {/* Items list */}
      {!note.archived && (
        <ul className="list-disc pl-5 mb-4 space-y-1">
          {note.items.map((item, i) => (
            <li key={i} className="text-gray-800">
              {renderWithLinks(item)}
            </li>
          ))}
        </ul>
      )}

      {/* Footer with timestamp and actions */}
      <div className="relative flex justify-end space-x-2 flex-wrap gap-y-2 mt-4">
        <p className="text-xs text-gray-500 absolute bottom-0 left-0">
          {note.updated_at && formatTime(note.updated_at, true)}
        </p>

         {/* Pin/Unpin button */}
        <button
            onClick={() => onTogglePin(note.id)}
            className={clsx(
            "flex flex-col items-center transition-colors",
            note.pinned ? "text-primary" : "text-gray-500 hover:text-primary"
            )}
            title={note.pinned ? "Odepnij" : "Przypnij"}
        >
            <Pin className={clsx("w-5 h-5 sm:w-6 sm:h-6", note.pinned && "fill-primary")} />
            <span className="text-[9px] sm:text-[11px]">
            {note.pinned ? "Odepnij" : "Przypnij"}
            </span>
        </button>

        {/* Archive/Restore button */}
        <button
            onClick={() => onToggleArchive(note.id)}
            className={clsx(
            "flex flex-col items-center transition-colors",
            note.archived
                ? "text-gray-700"
                : "text-gray-500 hover:text-gray-700"
            )}
            title={note.archived ? "Przywróć" : "Archiwizuj"}
        >
            <Archive className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[9px] sm:text-[11px]">
            {note.archived ? "Przywróć" : "Archiwum"}
            </span>
        </button>

        {/* Export to PDF button */}
        <button
            onClick={() => onExportPDF(note)}
            className="flex flex-col items-center text-gray-500 hover:text-gray-700 transition-colors"
            title="Eksportuj"
        >
            <Download className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[9px] sm:text-[11px]">PDF</span>
        </button>

        {/* Edit button */}
        <EditButton onClick={() => onEdit(note)} />

        {/* Delete button */}
        <DeleteButton onClick={() => onDelete(note.id)} />
      </div>
    </li>
  );
}