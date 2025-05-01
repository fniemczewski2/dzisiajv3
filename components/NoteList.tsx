"use client";
import React from "react";
import clsx from "clsx";
import { Edit2, Trash2 } from "lucide-react";
import { Note } from "../types";

interface NoteListProps {
  notes: Note[];
  onEdit: (n: Note) => void;
  onDelete: (id: string) => void;
}

export function NoteList({ notes, onEdit, onDelete }: NoteListProps) {
  return (
    <ul className="flex flex-wrap justify-center">
      {notes.map((n) => (
        <li
          key={n.id}
          className={clsx(
            "py-2 px-4 sm:py-4 my-2 sm:m-4 max-w-sm min-w-[300px] rounded-xl shadow flex flex-col justify-between",
            `bg-${n.bg_color}`
          )}
        >
          <h3 className="font-semibold text-lg mb-2">{n.title}</h3>
          <ul className="list-disc pl-5 mb-4">
            {n.items.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => onEdit(n)}
              className="flex flex-col items-center text-primary hover:text-secondary transition-colors"
            >
              <Edit2 className="w-5 h-5" />
              <span className="text-xs mt-1">Edytuj</span>
            </button>
            <button
              onClick={() => onDelete(n.id)}
              className="flex flex-col items-center text-red-500 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-xs mt-1">Usuń</span>
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
