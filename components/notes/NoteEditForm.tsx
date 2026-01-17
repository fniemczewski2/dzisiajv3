// components/Notes/NoteEditForm.tsx
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
    if (titleRef.current) {
      titleRef.current.focus();
    }
  }, []);

  const handleSave = () => {
    if (!itemsRef.current) {
      onSave(note);
      return;
    }

    // Normalize items from textarea
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

    onSave({
      ...note,
      items: normalizedItems,
    });
  };

  return (
    <li className="break-inside-avoid bg-gray-50 border-2 border-gray-300 py-2 px-4 sm:py-4 my-2 sm:m-4 max-w-sm min-w-[300px] rounded-xl shadow-lg flex flex-col max-h-fit">
      <div className="space-y-3">
        {/* Title */}
        <div>
          <label className="text-xs font-semibold text-gray-700">Tytuł:</label>
          <input
            ref={titleRef}
            type="text"
            value={note.title}
            onChange={(e) => onChange({ ...note, title: e.target.value })}
            className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Items */}
        <div>
          <label className="text-xs font-semibold text-gray-700">Treść:</label>
          <textarea
            ref={itemsRef}
            defaultValue={note.items.join("\n")}
            placeholder="Pozycje listy (jeden element na linię)"
            className="w-full mt-1 p-2 border rounded-lg h-28 focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Color Picker */}
        <div className="flex gap-2 items-center">
          <span className="text-xs font-semibold text-gray-700">Kolor:</span>
          {tailwindColors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange({ ...note, bg_color: color })}
              className={clsx(
                "w-6 h-6 rounded-full border-2 transition",
                note.bg_color === color
                  ? "border-secondary ring-2 ring-secondary"
                  : "border-transparent hover:border-gray-400",
                colorMap[color]
              )}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <SaveButton onClick={handleSave} type="button" />
          <CancelButton onCancel={onCancel} />
        </div>
      </div>
    </li>
  );
}