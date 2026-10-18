// components/notes/NoteEditForm.tsx

import { noteColorClass } from "@/config/noteColors";
import React, { useRef, useEffect, KeyboardEvent } from "react";
import clsx from "clsx";
import { Note } from "@/types/notes";
import { FormButtons } from "@/components/ui/CommonButtons";
import NoteColorPicker from "@/components/notes/NoteColorPicker";
import NoteFormatToolbar from "./NoteFormatToolbar";
import { normalizeNoteLine } from "@/lib/notesUtils";
import { handleListContinuation } from "@/lib/noteEditing";

interface NoteEditFormProps {
  note: Note;
  onSave: (note: Note) => void;
  onCancel: () => void;
  onChange: (note: Note) => void;
  loading: boolean;
}

export default function NoteEditForm({ note, onSave, onCancel, onChange, loading }: Readonly<NoteEditFormProps>) {
  const titleRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (titleRef.current) titleRef.current.focus();
  }, []);

  const handleSave = () => {
    if (!itemsRef.current) {
      onSave(note);
      return;
    }

    const normalizedItems = itemsRef.current.value.split("\n").map(normalizeNoteLine).filter(Boolean);

    onSave({ ...note, items: normalizedItems });
  };

  const handleTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return;
    if (handleListContinuation(e.currentTarget)) {
      e.preventDefault();
    }
  };

  return (
    <li
      className={clsx(
        "my-2 flex max-h-fit max-w-sm min-w-[300px] break-inside-avoid flex-col rounded-card border-2 px-5 py-4 shadow-lg transition-colors sm:m-3",
        noteColorClass(note.bg_color)
      )}
    >
      <div className="space-y-4">
        <div>
          <label className="form-label" htmlFor="title">
            Tytuł:
          </label>
          <input
            id="title"
            ref={titleRef}
            type="text"
            value={note.title}
            onChange={(e) => onChange({ ...note, title: e.target.value })}
            className="input-field bg-card/60 font-medium"
          />
        </div>
        <div>
          <label className="form-label" htmlFor="desc">
            Treść:
          </label>
          <div className="mb-2">
            <NoteFormatToolbar textareaRef={itemsRef} disabled={loading} />
          </div>
          <textarea
            id="desc"
            ref={itemsRef}
            onKeyDown={handleTextareaKeyDown}
            defaultValue={note.items.join("\n")}
            placeholder="Notatka… linki wklejone w tekście stają się klikalne automatycznie"
            className="input-field h-32 bg-card/60"
          />
        </div>
        <NoteColorPicker
          value={note.bg_color}
          onChange={(bg_color) => onChange({ ...note, bg_color })}
          disabled={loading}
        />
        <FormButtons onClickSave={handleSave} onClickClose={onCancel} loading={loading} />
      </div>
    </li>
  );
}
