// components/notes/NoteCard.tsx

import React from "react";
import clsx from "clsx";
import { Pin, Archive } from "lucide-react";
import { Note } from "@/types/notes";
import { formatTime } from "@/lib/dateUtils";
import { groupNoteLines, renderNoteLineContent } from "@/lib/noteFormatting";
import { ArchiveButton, DeleteButton, EditButton, PinButton } from "../ui/CommonButtons";

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
  return (
    <li
      className={clsx(
        // `relative` is required here: the pin/archive badge below is
        // `absolute`ed and was previously positioning against the nearest
        // ancestor with a position other than static instead of this card.
        "relative break-inside-avoid p-4 max-w-sm min-w-75 rounded-2xl shadow-sm flex flex-col justify-start border card border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-md max-h-fit mt-4 first:mt-0",
        colorMap[note.bg_color],
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
        <div className="my-2 space-y-1.5">
          {groupNoteLines(note.items).map((block, blockIndex) => {
            const blockKey = `${note.id}-block-${blockIndex}`;
            const itemClass = "text-sm text-textSecondary leading-relaxed marker:text-textMuted";

            if (block.kind === "bullet") {
              return (
                <ul key={blockKey} className="list-disc pl-5 space-y-1">
                  {block.lines.map((line, lineIndex) => (
                    <li key={`${blockKey}-${lineIndex}`} className={itemClass}>
                      {renderNoteLineContent(line, `${blockKey}-${lineIndex}`)}
                    </li>
                  ))}
                </ul>
              );
            }

            if (block.kind === "number") {
              return (
                <ol key={blockKey} className="list-decimal pl-5 space-y-1">
                  {block.lines.map((line, lineIndex) => (
                    <li key={`${blockKey}-${lineIndex}`} className={itemClass}>
                      {renderNoteLineContent(line, `${blockKey}-${lineIndex}`)}
                    </li>
                  ))}
                </ol>
              );
            }

            return (
              <p key={blockKey} className="text-sm text-textSecondary leading-relaxed">
                {renderNoteLineContent(block.lines[0], blockKey)}
              </p>
            );
          })}
        </div>
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
