"use client";
import React, { useState, FormEvent, useEffect } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { PlusCircleIcon, Loader2 } from "lucide-react";
import clsx from "clsx";
import { Note } from "../types";

interface NoteFormProps {
  userEmail: string;
  onChange: () => void;
  onCancel?: () => void;
  initial?: Note;
}
export function NoteForm({
  userEmail,
  onChange,
  onCancel,
  initial,
}: NoteFormProps) {
  const supabase = useSupabaseClient();
  const isEdit = !!initial;
  const [title, setTitle] = useState(initial?.title || "");
  const [itemsText, setItemsText] = useState((initial?.items || []).join("\n"));
  const [bgColor, setBgColor] = useState(initial?.bg_color || "zinc-50");
  const [loading, setLoading] = useState(false);

  const tailwindColors = [
    "zinc-50",
    "yellow-100",
    "green-100",
    "cyan-100",
    "red-100",
  ];

  useEffect(() => {
    if (initial) {
      setTitle(initial.title);
      setItemsText(initial.items.join("\n"));
      setBgColor(initial.bg_color);
    }
  }, [initial]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const items = itemsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = { user_name: userEmail, title, items, bg_color: bgColor };

    if (isEdit) {
      await supabase.from("notes").update(payload).eq("id", initial!.id);
    } else {
      await supabase.from("notes").insert(payload);
    }

    setLoading(false);
    onChange();
    if (!isEdit) {
      setTitle("");
      setItemsText("");
      setBgColor("zinc-50");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-card p-4 rounded-xl shadow max-w-lg"
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Tytuł notatki"
        className="w-full p-2 border rounded"
        required
      />
      <textarea
        value={itemsText}
        onChange={(e) => setItemsText(e.target.value)}
        placeholder="Pozycje listy (jeden element na linię)"
        className="w-full p-2 border rounded h-24"
        required
      />
      <div className="flex gap-2">
        {tailwindColors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => setBgColor(color)}
            className={clsx(
              "w-8 h-8 rounded-full border-2 transition",
              bgColor === color
                ? "border-secondary"
                : "border-transparent hover:border-gray-400",
              `bg-${color}`
            )}
            title={color}
          />
        ))}
      </div>
      <div className="flex space-x-2 items-center">
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-white rounded-xl"
        >
          {isEdit ? "Zapisz" : "Dodaj"}
        </button>
        {typeof onCancel === "function" && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 rounded-xl"
          >
            Anuluj
          </button>
        )}
        {loading && <Loader2 className="animate-spin w-6 h-6 text-gray-500" />}
      </div>
    </form>
  );
}
