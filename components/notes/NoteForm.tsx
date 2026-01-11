"use client";

import React, { useRef, useState, FormEvent } from "react";
import clsx from "clsx";
import { Note } from "../../types";
import { useNotes } from "../../hooks/useNotes";
import LoadingState from "../LoadingState";
import { useSession } from "@supabase/auth-helpers-react";
import { AddButton, CancelButton } from "../CommonButtons";

interface NoteFormProps {
  onChange: () => void;
  onCancel?: () => void;
}

const COLOR_MAP: { [key: string]: string } = {
  "zinc-50": "bg-zinc-50",
  "yellow-100": "bg-yellow-100",
  "green-100": "bg-green-100",
  "cyan-100": "bg-cyan-100",
  "red-100": "bg-red-100",
};

export default function NoteForm({
  onChange,
  onCancel,
}: NoteFormProps) {
  const { addNote, loading } = useNotes();
  const session = useSession();
  const userEmail = session?.user?.email || "";
  const titleRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<HTMLTextAreaElement>(null);
  const [bgColor, setBgColor] = useState("zinc-50");

  const tailwindColors = Object.keys(COLOR_MAP);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const title = titleRef.current?.value.trim() || "";
    const rawItems = itemsRef.current?.value || "";

    const normalizeItem = (line: string) => {
      let cleaned = line.trim();

      const urlRegex = /^(https?:\/\/)?([\w.-]+\.[a-z]{2,})(\/\S*)?$/i;
      if (urlRegex.test(cleaned)) {
        if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
          cleaned = "https://" + cleaned;
        }
      }

      return cleaned;
    };

    const items = rawItems
      .split("\n")
      .map((line) => normalizeItem(line))
      .filter(Boolean);

    const payload: Note = {
      user_name: userEmail || "",
      title,
      items,
      bg_color: bgColor,
    } as Note;
    await addNote(payload);
    onChange();
    if (onCancel) onCancel();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-card p-4 rounded-xl shadow max-w-lg"
    >
      <div>
        <label className="block text-sm font-medium" htmlFor="title">
          Tytuł:
        </label>
        <input
          id="title"
          ref={titleRef}
          type="text"
          placeholder="Tytuł notatki"
          className="w-full p-2 border rounded"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="desc">
          Treść:
        </label>
        <textarea
          id="desc"
          ref={itemsRef}
          placeholder="Pozycje listy (jeden element na linię)"
          className="w-full p-2 border rounded h-24"
          required
          disabled={loading}
        />
      </div>

      <div className="flex gap-2 items-center">
        <span className="block text-sm font-medium">Kolor:</span>
        {tailwindColors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => setBgColor(color)}
            aria-label={`Wybierz kolor ${color}`}
            disabled={loading}
            className={clsx(
              "w-8 h-8 rounded-full border-2 transition focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed",
              bgColor === color
                ? "border-secondary ring-secondary"
                : "border-transparent hover:border-gray-400",
              COLOR_MAP[color]
            )}
          />
        ))}
      </div>

      <div className="flex space-x-2 items-center">
        <AddButton loading={loading} />

        {typeof onCancel === "function" && (
          <CancelButton onCancel={onCancel} loading={loading} />
        )}

        {loading && <LoadingState />}
      </div>
    </form>
  );
}