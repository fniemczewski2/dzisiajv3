"use client";

import React, { useRef, useEffect, useState, FormEvent } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { PlusCircleIcon, Loader2, Save } from "lucide-react";
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

  const titleRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<HTMLTextAreaElement>(null);
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
      if (titleRef.current) titleRef.current.value = initial.title;
      if (itemsRef.current) itemsRef.current.value = initial.items.join("\n");
      setBgColor(initial.bg_color);
    } else {
      if (titleRef.current) titleRef.current.value = "";
      if (itemsRef.current) itemsRef.current.value = "";
      setBgColor("zinc-50");
    }
  }, [initial]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const title = titleRef.current?.value.trim() || "";
    const rawItems = itemsRef.current?.value || "";

    const items = rawItems
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const payload = {
      user_name: userEmail,
      title,
      items,
      bg_color: bgColor,
    };

    if (isEdit && initial) {
      await supabase.from("notes").update(payload).eq("id", initial.id);
    } else {
      await supabase.from("notes").insert(payload);
    }

    setLoading(false);
    onChange();

    if (!isEdit && titleRef.current && itemsRef.current) {
      titleRef.current.value = "";
      itemsRef.current.value = "";
      setBgColor("zinc-50");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-card p-4 rounded-xl shadow max-w-lg"
    >
      <div>
        <label htmlFor="title">Tytuł:</label>
        <input
          id="title"
          ref={titleRef}
          type="text"
          placeholder="Tytuł notatki"
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label htmlFor="desc">Treść:</label>
        <textarea
          id="desc"
          ref={itemsRef}
          placeholder="Pozycje listy (jeden element na linię)"
          className="w-full p-2 border rounded h-24"
          required
        />
      </div>

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
          className="px-4 py-2 bg-primary hover:bg-secondary text-white rounded-lg flex items-center"
        >
          {isEdit ? (
            <>
              Zapisz&nbsp;
              <Save className="w-5 h-5" />
            </>
          ) : (
            <>
              Dodaj&nbsp;
              <PlusCircleIcon className="w-5 h-5" />
            </>
          )}
        </button>
        {typeof onCancel === "function" && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg"
          >
            Anuluj
          </button>
        )}
        {loading && <Loader2 className="animate-spin w-6 h-6 text-gray-500" />}
      </div>
    </form>
  );
}
