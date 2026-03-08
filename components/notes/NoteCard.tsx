"use client";
import React from "react";
import clsx from "clsx";
import { Pin, Archive, Download } from "lucide-react";
import { Note } from "../../types";
import { formatTime } from "../../lib/dateUtils";
import { ArchiveButton, DeleteButton, EditButton, PinButton } from "../CommonButtons";

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

        if (!href.startsWith("http")) href = "https://" + href;
        displayText = displayText.replace(/^https?:\/\//, "").replace(/^www\./, "");

        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-secondary underline font-medium transition-colors"
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
        "break-inside-avoid py-4 px-5 my-2 sm:m-3 max-w-sm min-w-[300px] rounded-2xl shadow-sm flex flex-col justify-start border transition-all duration-200 hover:shadow-md max-h-fit relative group",
        colorMap[note.bg_color] || "bg-card border-gray-200 dark:border-gray-700",
        note.archived && "opacity-60 grayscale-[0.3]"
      )}
    >
      {/* Wskaźniki Przypięcia/Archiwum */}
      {note.pinned && !note.archived && (
        <div className="absolute -top-2 -right-2 bg-card p-1.5 rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
          <Pin className="w-4 h-4 text-primary fill-primary" />
        </div>
      )}

      {note.archived && (
        <div className="absolute -top-2 -right-2 bg-card p-1.5 rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
          <Archive className="w-4 h-4 text-textMuted" />
        </div>
      )}

      {/* Tytuł */}
      <div className="flex justify-between items-end border-b border-black/5 dark:border-white/5">
      <h3 className="font-bold text-lg text-text mb-3 pr-4 leading-tight">{note.title}</h3>
      <p className="flex-1 text-[10px] text-textMuted font-medium text-right whitespace-nowrap">
        {note.updated_at && formatTime(note.updated_at, true)}
      </p>
      </div>

      {/* Treść (Lista) */}
      {!note.archived && (
        <ul className="list-disc pl-5 my-2 space-y-1.5">
          {note.items.map((item, i) => (
            <li key={i} className="text-sm text-textSecondary leading-relaxed marker:text-textMuted">
              {renderWithLinks(item)}
            </li>
          ))}
        </ul>
      )}

      {/* Stopka i Akcje */}
      <div className="relative flex justify-end gap-1.5 flex-wrap mt-auto pt-3 border-t border-black/5 dark:border-white/5">
        <PinButton onClick={() => onTogglePin(note.id)} isPinned={!!note.pinned} />
        <ArchiveButton onClick={() => onToggleArchive(note.id)} isArchived={!!note.archived} />
        <EditButton onClick={() => onEdit(note)} />
        <DeleteButton onClick={() => onDelete(note.id)} />
      </div>
    </li>
  );
}