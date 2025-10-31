"use client";
import React, { use, useState } from "react";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { ShoppingList } from "../../types";

interface ShoppingListViewProps {
  userEmail: string;
  lists: ShoppingList[];
  onEdit: (l: ShoppingList) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<ShoppingList>) => void;
}

export function ShoppingListView({
  userEmail,
  lists,
  onEdit,
  onDelete,
  onUpdate,
}: ShoppingListViewProps) {
  const toggleElement = (list: ShoppingList, elId: string) => {
    const updated = list.elements.map((el) =>
      el.id === elId ? { ...el, completed: !el.completed } : el
    );
    onUpdate(list.id, { elements: updated });
  };

  const addElement = (list: ShoppingList, text: string) => {
    if (!text.trim()) return;
    const updated = [
      ...list.elements,
      { id: crypto.randomUUID(), text: text.trim(), completed: false },
    ];
    onUpdate(list.id, { elements: updated });
  };

  return (
    <ul className="flex flex-wrap justify-center">
      {lists.map((list) => (
        <li
          key={list.id}
          className="py-2 px-4 sm:py-4 my-2 sm:m-4 max-w-sm min-w-[300px] rounded-xl shadow flex flex-col justify-between hover:shadow-lg bg-card"
        >
        <span className="flex justify-between w-full">
            <div className="flex flex-col mr-6">
                <h3 className="font-semibold text-lg mb-1">{list.name}</h3>
                <p className="text-sm text-gray-500 mb-2 ">
                    Udostępnione{userEmail === list.share ? `\u00A0przez\u00A0${list.user_email.split("@")[0]}` : `:\u00A0${list.share?.split("@")[0]}`}
                </p>
            </div>
            <div className="flex justify-end space-x-4 mt-3">
                <button
                onClick={() => onEdit(list)}
                className="flex flex-col items-center text-primary hover:text-secondary transition-colors"
                >
                <Edit2 className="w-5 h-5" />
                <span className="text-xs mt-1">Edytuj</span>
                </button>
                <button
                onClick={() => onDelete(list.id)}
                className="flex flex-col items-center text-red-500 hover:text-red-600 transition-colors"
                >
                <Trash2 className="w-5 h-5" />
                <span className="text-xs mt-1">Usuń</span>
                </button>
            </div>
        </span>
          

          <ul className="list-none pl-2 my-2 space-y-1">
            {list.elements.map((el) => (
              <li
                key={el.id}
                className={`flex items-center ${
                  el.completed ? "line-through text-gray-500" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={el.completed}
                  onChange={() => toggleElement(list, el.id)}
                  className="mr-2 h-5 w-5 "
                />
                {el.text}
              </li>
            ))}
          </ul>

          {/* Formularz dodawania nowego elementu */}
          <AddElementForm onAdd={(text) => addElement(list, text)} />

          {/* Akcje listy */}
          
        </li>
      ))}
    </ul>
  );
}

function AddElementForm({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAdd(text);
      setText("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
      <input
        type="text"
        placeholder="Nowy produkt"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full border px-2 py-1 rounded"
      />
      <button
        className="flex items-center text-blue-600 hover:underline"
        type="submit"
      >
        Dodaj&nbsp;<Plus className="text-blue-600 w-4 h-4 mr-1" />
      </button>
    </form>
  );
}
