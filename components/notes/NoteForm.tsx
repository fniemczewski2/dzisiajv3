// components/notes/NoteForm.tsx

import { DEFAULT_NOTE_COLOR } from "@/config/noteColors";
import React, { useRef, useState, SyntheticEvent, KeyboardEvent } from "react";
import { Note } from "@/types/notes";
import { useNotes } from "@/hooks/db/useNotes";
import { useAuth } from "@/providers/AuthProvider";
import { FormButtons } from "@/components/ui/CommonButtons";
import NoteColorPicker from "@/components/notes/NoteColorPicker";
import NoteFormatToolbar from "./NoteFormatToolbar";
import { normalizeNoteLine } from "@/lib/notesUtils";
import { handleListContinuation } from "@/lib/noteEditing";

interface NoteFormProps {
  onChange: () => void;
  onCancel?: () => void;
}

export default function NoteForm({ onChange, onCancel }: Readonly<NoteFormProps>) {
  const { addNote, loading } = useNotes();
  const { user } = useAuth();
  const titleRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<HTMLTextAreaElement>(null);
  const [bgColor, setBgColor] = useState(DEFAULT_NOTE_COLOR);

  const handleTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return;
    if (handleListContinuation(e.currentTarget)) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    const title = titleRef.current?.value.trim() || "";
    const items = (itemsRef.current?.value || "").split("\n").map(normalizeNoteLine).filter(Boolean);

    const payload: Note = {
      user_id: user?.id || "",
      title,
      items,
      bg_color: bgColor,
    } as Note;

    await addNote(payload);
    onChange();
    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit} className="form-card max-w-lg">
      <div>
        <label className="form-label" htmlFor="title">
          Tytuł:
        </label>
        <input
          id="title"
          ref={titleRef}
          type="text"
          placeholder="Tytuł notatki"
          className="input-field"
          required
          disabled={loading}
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
          placeholder="Notatka… linki wklejone w tekście stają się klikalne automatycznie"
          className="input-field min-h-[120px]"
          required
          disabled={loading}
        />
      </div>
      <NoteColorPicker value={bgColor} onChange={setBgColor} disabled={loading} />
      <FormButtons onClickClose={onCancel} loading={loading} />
    </form>
  );
}
