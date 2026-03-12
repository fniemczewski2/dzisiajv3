"use client";
import React, { useRef, useEffect } from "react";
import clsx from "clsx";
import { Note } from "../../types";
import { SaveButton, CancelButton } from "../CommonButtons";

interface NoteEditFormProps {
  note: Note;
  onSave: (note: Note) => void;
  onCancel: () => void;
  onChange: (note: Note) => void;
  colorMap: { [key: string]: string };
}

export default function NoteEditForm({
  note,
  onSave,
  onCancel,
  onChange,
  colorMap,
}: NoteEditFormProps) {
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
      .map((line) => {
        let cleaned = line.trim();
        const urlRegex = /^(https?:\/\/)?([\w.-]+\.[a-z]{2,})(\/\S*)?$/i;
        if (urlRegex.test(cleaned)) {
          if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
            cleaned = "https://" + cleaned;
          }
        }
        return cleaned;
      })
      .filter(Boolean);

    onSave({ ...note, items: normalizedItems });
  };

  return (
    <li className={clsx(
        "break-inside-avoid border-2 py-4 px-5 my-2 sm:m-3 max-w-sm min-w-[300px] rounded-2xl shadow-lg flex flex-col max-h-fit transition-colors",
        note.bg_color === "zinc-50" ? "card" : colorMap[note.bg_color]
      )}
    >
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="form-label">Tytuł notatki:</label>
          <input
            ref={titleRef}
            type="text"
            value={note.title}
            onChange={(e) => onChange({ ...note, title: e.target.value })}
            className="input-field bg-white/50 dark:bg-black/20 font-medium"
          />
        </div>

        {/* Items */}
        <div>
          <label className="form-label">Treść (jeden element na linię):</label>
          <textarea
            ref={itemsRef}
            defaultValue={note.items.join("\n")}
            placeholder="Wpisz listę rzeczy..."
            className="input-field bg-white/50 dark:bg-black/20 h-32"
          />
        </div>

        {/* Color Picker */}
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
                  colorMap[color].split(" ")[0] // Używa tylko pierwszej klasy (tła) dla kółka koloru
                )}
                title={`Wybierz kolor`}
              />
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <SaveButton onClick={handleSave} type="button" />
          <CancelButton onCancel={onCancel} />
        </div>
      </div>
    </li>
  );
}