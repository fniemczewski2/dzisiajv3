// components/notes/NoteEditForm.tsx

import React, { useRef, useEffect, KeyboardEvent } from "react";
import clsx from "clsx";
import { Note } from "@/types/notes";
import { FormButtons } from "../ui/CommonButtons";
import NoteFormatToolbar from "./NoteFormatToolbar";
import { normalizeNoteLine } from "@/lib/notesUtils";
import { handleListContinuation } from "@/lib/noteEditing";

interface NoteEditFormProps {
  note: Note;
  onSave: (note: Note) => void;
  onCancel: () => void;
  onChange: (note: Note) => void;
  colorMap: { [key: string]: string };
  loading: boolean;
}

export default function NoteEditForm({
  note,
  onSave,
  onCancel,
  onChange,
  colorMap,
  loading
}: Readonly<NoteEditFormProps>) {
  const titleRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<HTMLTextAreaElement>(null);

  const tailwindColors = Object.keys(colorMap);

  useEffect(() => {
    if (titleRef.current) titleRef.current.focus();
  }, []);

  const handleSave = () => {
    if (!itemsRef.current) {
      onSave(note);
      return;
    }

    const normalizedItems = itemsRef.current.value
      .split("\n")
      .map(normalizeNoteLine)
      .filter(Boolean);

    onSave({ ...note, items: normalizedItems });
  };

  const handleTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return;
    if (handleListContinuation(e.currentTarget)) {
      e.preventDefault();
    }
  };

  return (
    <li className={clsx(
        "break-inside-avoid border-2 py-4 px-5 my-2 sm:m-3 max-w-sm min-w-[300px] rounded-2xl shadow-lg flex flex-col max-h-fit transition-colors",
        note.bg_color === "zinc-50" ? "card" : colorMap[note.bg_color]
      )}
    >
      <div className="space-y-4">
        <div>
        <label className="form-label" htmlFor="title">Tytuł:</label>
        <input 
            id="title" 
            ref={titleRef} 
            type="text"
            value={note.title}
            onChange={(e) => onChange({ ...note, title: e.target.value })}
            className="input-field bg-white/50 dark:bg-black/20 font-medium"
          />
        </div>
        <div>
          <label className="form-label" htmlFor="desc">Treść:</label>
          <div className="mb-2">
            <NoteFormatToolbar textareaRef={itemsRef} disabled={loading} />
          </div>
          <textarea
            id="desc"
            ref={itemsRef}
            onKeyDown={handleTextareaKeyDown}
            defaultValue={note.items.join("\n")}
            placeholder="Notatka… linki wklejone w tekście stają się klikalne automatycznie"
            className="input-field bg-white/50 dark:bg-black/20 h-32"
          />
        </div>
        <div className="bg-white/50 dark:bg-black/20 p-2 rounded-xl border border-black/5 dark:border-white/5">
          <span className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2 pl-1">
            Kolor tła
          </span>
          <div className="flex gap-3 items-center px-1">
            {tailwindColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onChange({ ...note, bg_color: color })}
                className={clsx(
                  "w-7 h-7 rounded-full border-2 transition-all shadow-sm",
                  note.bg_color === color
                    ? "border-primary ring-2 ring-primary ring-offset-2 dark:ring-offset-card scale-110"
                    : "border-black/10 dark:border-white/10 hover:scale-110",
                  colorMap[color].split(" ")[0] 
                )}
                title={`Wybierz kolor`}
              />
            ))}
          </div>
        </div>
          <FormButtons onClickSave={handleSave} onClickClose={onCancel} loading={loading} />
      </div>
    </li>
  );
}
