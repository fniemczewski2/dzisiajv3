"use client";
import React from "react";
import { Edit2, Trash2, CheckSquare } from "lucide-react";
import { ShoppingList } from "../../types";

interface ShoppingListViewProps {
  lists: ShoppingList[];
  onEdit: (l: ShoppingList) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<ShoppingList>) => void;
}

export function ShoppingListView({
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

  return (
    <ul className="flex flex-wrap justify-center">
      {lists.map((list) => (
        <li
          key={list.id}
          className="py-2 px-4 sm:py-4 my-2 sm:m-4 max-w-sm min-w-[300px] rounded-xl shadow flex flex-col justify-between hover:shadow-lg bg-card"
        >
          <h3 className="font-semibold text-lg mb-1">{list.name}</h3>
          <p className="text-sm text-gray-500 mb-2">
            Udostępnione: {list.share || "nie"}
          </p>

          <ul className="list-disc pl-5 mb-4 space-y-1">
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
                  className="mr-2 h-4 w-4"
                />
                {el.text}
              </li>
            ))}
          </ul>

          <div className="flex justify-end space-x-4">
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
        </li>
      ))}
    </ul>
  );
}
