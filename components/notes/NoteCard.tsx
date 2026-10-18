// components/notes/NoteCard.tsx

import { noteColorClass } from "@/config/noteColors";
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
}

export default function NoteCard({ note, onEdit, onDelete, onTogglePin, onToggleArchive }: Readonly<NoteCardProps>) {
  return (
    <li
      className={clsx(
        "relative mt-4 flex max-h-fit max-w-sm min-w-75 break-inside-avoid flex-col justify-start rounded-card border p-4 transition-colors first:mt-0",
        noteColorClass(note.bg_color),
        note.archived && "opacity-60 grayscale-[0.3]"
      )}
    >
      {note.pinned && !note.archived && (
        <div className="card absolute -top-2 -right-2 rounded-full p-1.5 shadow-sm">
          <Pin className="h-4 w-4 fill-primary text-primary" />
        </div>
      )}
      {note.archived && (
        <div className="card absolute -top-2 -right-2 rounded-full p-1.5 shadow-sm">
          <Archive className="h-4 w-4 text-text-muted" />
        </div>
      )}

      <div className="mb-3 flex items-end justify-between border-b border-line-strong">
        <h3 className="pr-2 text-lg font-bold text-text">{note.title}</h3>
        <p className="flex-1 text-right text-xs font-medium whitespace-nowrap text-text-muted">
          {note.updated_at && formatTime(note.updated_at, true)}
        </p>
      </div>

      {!note.archived && (
        <div className="my-2 space-y-1.5">
          {groupNoteLines(note.items).map((block, blockIndex) => {
            const blockKey = `${note.id}-block-${blockIndex}`;
            const itemClass = "text-sm text-text-secondary leading-relaxed marker:text-text-muted";

            if (block.kind === "bullet") {
              return (
                <ul key={blockKey} className="list-disc space-y-1 pl-5">
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
                <ol key={blockKey} className="list-decimal space-y-1 pl-5">
                  {block.lines.map((line, lineIndex) => (
                    <li key={`${blockKey}-${lineIndex}`} className={itemClass}>
                      {renderNoteLineContent(line, `${blockKey}-${lineIndex}`)}
                    </li>
                  ))}
                </ol>
              );
            }

            return (
              <p key={blockKey} className="text-sm leading-relaxed text-text-secondary">
                {renderNoteLineContent(block.lines[0], blockKey)}
              </p>
            );
          })}
        </div>
      )}

      <div className="relative mt-auto flex flex-wrap justify-end gap-1.5 pt-3">
        <PinButton onClick={() => onTogglePin(note.id)} isPinned={!!note.pinned} />
        <ArchiveButton onClick={() => onToggleArchive(note.id)} isArchived={!!note.archived} />
        <EditButton onClick={() => onEdit(note)} />
        <DeleteButton onClick={() => onDelete(note.id)} />
      </div>
    </li>
  );
}
