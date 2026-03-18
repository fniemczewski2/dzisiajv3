"use client";

import React, { useRef, useState, SyntheticEvent } from "react";
import clsx from "clsx";
import { Note } from "../../types";
import { useNotes } from "../../hooks/useNotes";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";
import LoadingState from "../LoadingState";
import { AddButton, CancelButton } from "../CommonButtons";

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

export default function NoteForm({ onChange, onCancel }: NoteFormProps) {
  const { addNote, loading } = useNotes();
  const { toast } = useToast();
  const { user } = useAuth();
  const titleRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<HTMLTextAreaElement>(null);
  const [bgColor, setBgColor] = useState("zinc-50");

  const tailwindColors = Object.keys(COLOR_MAP);

  const normalizeItem = (line: string) => {
    let cleaned = line.trim();
    const urlRegex = /^(https?:\/\/)?([\w.-]+\.[a-z]{2,})(\/\S*)?$/i;
    if (urlRegex.test(cleaned) && !cleaned.startsWith("http")) {
      cleaned = "https://" + cleaned;
    }
    return cleaned;
  };

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    const title = titleRef.current?.value.trim() || "";
    const items = (itemsRef.current?.value || "")
      .split("\n")
      .map(normalizeItem)
      .filter(Boolean);

    const payload: Note = {
      user_id: user?.id || "",
      title,
      items,
      bg_color: bgColor,
    } as Note;

    await withRetry(
      () => addNote(payload),
      toast,
      { context: "NoteForm.addNote", userId: user?.id }
    );

    toast.success("Dodano pomyślnie.");
    onChange();
    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit} className="form-card max-w-lg">
      <div>
        <label className="form-label" htmlFor="title">Tytuł:</label>
        <input id="title" ref={titleRef} type="text"
          placeholder="Tytuł notatki"
          className="input-field font-semibold" required disabled={loading} />
      </div>
      <div>
        <label className="form-label" htmlFor="desc">Treść:</label>
        <textarea id="desc" ref={itemsRef}
          placeholder="Pozycje listy (jeden element na linię)"
          className="input-field min-h-[120px]" required disabled={loading} />
      </div>
      <div className="flex gap-3 items-center py-1">
        <span className="form-label mb-0">Kolor:</span>
        <div className="flex gap-2">
          {tailwindColors.map((color) => (
            <button key={color} type="button" onClick={() => setBgColor(color)}
              aria-label={`Wybierz kolor ${color}`} disabled={loading}
              className={clsx(
                "w-8 h-8 rounded-full border-2 transition focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm",
                bgColor === color
                  ? "border-primary ring-2 ring-primary ring-offset-2 dark:ring-offset-card"
                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500",
                COLOR_MAP[color]
              )} />
          ))}
        </div>
      </div>
      <div className="flex space-x-2 items-center pt-2">
        <AddButton loading={loading} />
        {typeof onCancel === "function" && <CancelButton onClick={onCancel} loading={loading} />}
        {loading && <LoadingState />}
      </div>
    </form>
  );
}