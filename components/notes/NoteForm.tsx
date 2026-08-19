// components/notes/NoteForm.tsx

import React, { useRef, useState, SyntheticEvent, KeyboardEvent } from "react";
import clsx from "clsx";
import { Note } from "@/types/notes";
import { useNotes } from "@/hooks/db/useNotes";
import { useAuth } from "@/providers/AuthProvider";
import { FormButtons } from "../ui/CommonButtons";
import NoteFormatToolbar from "./NoteFormatToolbar";
import { normalizeNoteLine } from "@/lib/notesUtils";
import { handleListContinuation } from "@/lib/noteEditing";

interface NoteFormProps {
  onChange: () => void;
  onCancel?: () => void;
}

const COLOR_MAP: { [key: string]: string } = {
  "zinc-50":    "bg-zinc-50",
  "yellow-100": "bg-yellow-100",
  "green-100":  "bg-green-100",
  "cyan-100":   "bg-cyan-100",
  "red-100":    "bg-red-100",
};

export default function NoteForm({ onChange, onCancel }: Readonly<NoteFormProps>) {
  const { addNote, loading } = useNotes();
  const { user } = useAuth();
  const titleRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<HTMLTextAreaElement>(null);
  const [bgColor, setBgColor] = useState("zinc-50");

  const tailwindColors = Object.keys(COLOR_MAP);

  const handleTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return;
    if (handleListContinuation(e.currentTarget)) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    const title = titleRef.current?.value.trim() || "";
    const items = (itemsRef.current?.value || "")
      .split("\n")
      .map(normalizeNoteLine)
      .filter(Boolean);

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
        <label className="form-label" htmlFor="title">Tytuł:</label>
        <input id="title" ref={titleRef} type="text"
          placeholder="Tytuł notatki"
          className="input-field" required disabled={loading} />
      </div>
      <div>
        <label className="form-label" htmlFor="desc">Treść:</label>
        <div className="mb-2">
          <NoteFormatToolbar textareaRef={itemsRef} disabled={loading} />
        </div>
        <textarea id="desc" ref={itemsRef}
          onKeyDown={handleTextareaKeyDown}
          placeholder="Notatka… linki wklejone w tekście stają się klikalne automatycznie"
          className="input-field min-h-[120px]" required disabled={loading} />
      </div>
      <div className="flex flex-col gap-2 justify-center">
        <span className="form-label">Kolor:</span>
        <div className="flex gap-x-2">
          {tailwindColors.map((color) => (
            <button key={color} type="button" onClick={() => setBgColor(color)}
              aria-label={`Wybierz kolor ${color}`} disabled={loading}
              className={clsx(
                "w-8 h-8 rounded-full border-2 transition focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm",
                bgColor === color
                  ? "border-primary ring-1 ring-primary dark:ring-offset-card"
                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500",
                COLOR_MAP[color]
              )} />
          ))}
        </div>
      </div>
        <FormButtons onClickClose={onCancel} loading={loading} />
    </form>
  );
}
