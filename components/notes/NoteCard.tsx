// components/notes/NoteCard.tsx
"use client";
import React from "react";
import clsx from "clsx";
import { Pin, Archive } from "lucide-react";
import { Note } from "../../types";
import { formatTime } from "../../lib/dateUtils";
import { sanitizeHref } from "../../lib/sanitize";
import { ArchiveButton, DeleteButton, EditButton, PinButton } from "../CommonButtons";

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleArchive: (id: string) => void;
  colorMap: { [key: string]: string };
}

export default function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleArchive,
  colorMap,
}: Readonly<NoteCardProps>) {
  const renderWithLinks = (text: string, partPrefix: string) => {
    if (!text) return null;

    const urlRegex = /((?:https?:\/\/|www\.)[^\s]+)/gi;

    if (text.length > 5000) {
      return <span>{text.substring(0, 5000)}... (Text too long)</span>;
    }

    return text.split(urlRegex).map((part, i) => {
      if (!part) return null;
      
      const partKey = `${partPrefix}-p-${part.substring(0, 10)}-${i}`;

      if (/^(https?:\/\/|www\.)/i.test(part)) {
        const safeHref = sanitizeHref(part);

        if (!safeHref) {
          return <span key={partKey}>{part}</span>;
        }

        const displayText = safeHref
          .replace(/^https?:\/\//, "")
          .replace(/^www\./, "");

        return (
          <a
            key={partKey}
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-secondary underline font-medium transition-colors"
          >
            {displayText}
          </a>
        );
      }

      return <span key={partKey}>{part}</span>;
    });
  };

  return (
    <li
      className={clsx(
        "break-inside-avoid p-4 max-w-sm min-w-[300px] rounded-2xl shadow-sm flex flex-col justify-start border transition-all duration-200 hover:shadow-md max-h-fit mt-4 first:mt-0",
        colorMap[note.bg_color] || "card border-gray-200 dark:border-gray-700",
        note.archived && "opacity-60 grayscale-[0.3]"
      )}
    >
      {note.pinned && !note.archived && (
        <div className="absolute -top-2 -right-2 p-1.5 rounded-full shadow-sm card">
          <Pin className="w-4 h-4 text-primary fill-primary" />
        </div>
      )}
      {note.archived && (
        <div className="absolute -top-2 -right-2 p-1.5 rounded-full shadow-sm card">
          <Archive className="w-4 h-4 text-textMuted" />
        </div>
      )}

      <div className="flex justify-between items-end border-b mb-3 border-gray-300 dark:border-gray-700">
        <h3 className="font-bold text-lg text-text pr-2">{note.title}</h3>
        <p className="flex-1 text-[10px] text-textMuted font-medium text-right whitespace-nowrap">
          {note.updated_at && formatTime(note.updated_at, true)}
        </p>
      </div>

      {!note.archived && (
        note.items.length === 1 ? (
          <p className="text-sm text-textSecondary leading-relaxed my-2">
            {renderWithLinks(note.items[0], "single")}
          </p>
        ) : (
          <ul className="list-disc pl-5 my-2 space-y-1.5">
            {note.items.map((item, i) => {
              const itemKey = `${note.id}-item-${i}`;
              return (
                <li
                  key={itemKey}
                  className="text-sm text-textSecondary leading-relaxed marker:text-textMuted"
                >
                  {renderWithLinks(item, itemKey)}
                </li>
              );
            })}
          </ul>
        )
      )}

      <div className="relative flex justify-end gap-1.5 flex-wrap mt-auto pt-3">
        <PinButton onClick={() => onTogglePin(note.id)} isPinned={!!note.pinned} />
        <ArchiveButton
          onClick={() => onToggleArchive(note.id)}
          isArchived={!!note.archived}
        />
        <EditButton onClick={() => onEdit(note)} />
        <DeleteButton onClick={() => onDelete(note.id)} />
      </div>
    </li>
  );
}