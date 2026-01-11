"use client";
import React, { useState, useRef, useEffect } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { ShoppingList } from "../../types";
import { useShoppingLists } from "../../hooks/useShoppingLists";
import { useSettings } from "../../hooks/useSettings";
import { useSession } from "@supabase/auth-helpers-react";
import { EditButton, DeleteButton, SaveButton, CancelButton } from "../CommonButtons";

export default function ShoppingListView() {
  const { lists, deleteShoppingList, editShoppingList } = useShoppingLists();
  const { settings } = useSettings();
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [editedList, setEditedList] = useState<ShoppingList | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const userOptions = settings?.users ?? [];
  const session = useSession();
  const userEmail = session?.user?.email || "";

  useEffect(() => {
    if (editingId && nameRef.current) {
      nameRef.current.focus();
    }
  }, [editingId]);

  const handleEdit = (list: ShoppingList) => {
    setEditingId(list.id);
    setEditedList({ ...list });
  };

  const handleCancelEdit = () => {
    setEditingId(undefined);
    setEditedList(null);
  };

  const handleSaveEdit = async () => {
    if (editedList?.id) {
      await editShoppingList(editedList.id, {
        name: editedList.name,
        share: editedList.share,
      });
      setEditingId(undefined);
      setEditedList(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę listę zakupów?")) return;
    await deleteShoppingList(id);
  };

  const toggleElement = (list: ShoppingList, elId: string) => {
    const updated = list.elements.map((el) =>
      el.id === elId ? { ...el, completed: !el.completed } : el
    );
    if (list.id) {
      editShoppingList(list.id, { elements: updated });
    } 
  };

  const addElement = (list: ShoppingList, text: string) => {
    if (!text.trim()) return;
    const updated = [
      ...list.elements,
      { id: crypto.randomUUID(), text: text.trim(), completed: false },
    ];
    if (list.id) {
      editShoppingList(list.id, { elements: updated });
    }
  };

  const removeElement = (list: ShoppingList, elId: string) => {
    const updated = list.elements.filter((el) => el.id !== elId);
    
    if (list.id) {
      editShoppingList(list.id, { elements: updated });
    }
  };

  return (
    <ul className="flex flex-wrap justify-center">
      {lists.map((list) => {
        const isEditing = editingId === list.id;

        if (isEditing && editedList) {
          return (
            <li
              key={list.id}
              className="py-4 px-4 my-2 sm:m-4 max-w-sm min-w-[300px] rounded-xl shadow-lg flex flex-col bg-gray-50 border-2 border-gray-300"
            >
              <div className="space-y-3 mb-3">
                {/* Name */}
                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    Nazwa:
                  </label>
                  <input
                    ref={nameRef}
                    type="text"
                    value={editedList.name}
                    onChange={(e) =>
                      setEditedList({ ...editedList, name: e.target.value })
                    }
                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Share */}
                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    Udostępnij:
                  </label>
                  <select
                    value={editedList.share || ""}
                    onChange={(e) =>
                      setEditedList({ ...editedList, share: e.target.value || null })
                    }
                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Tylko dla mnie</option>
                    {userOptions.map((email) => (
                      <option key={email} value={email}>
                        {email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-2">
                  <SaveButton onClick={handleSaveEdit} type="button" />
                  <CancelButton onCancel={handleCancelEdit} />
                </div>
              </div>

              {/* Elements (read-only during edit) */}
              <ul className="list-none space-y-2 mb-3">
                {list.elements.map((el) => (
                  <li
                    key={el.id}
                    className={`flex items-center justify-between group ${
                      el.completed ? "line-through text-gray-500" : ""
                    }`}
                  >
                    <div className="flex items-center flex-1">
                      <input
                        type="checkbox"
                        checked={el.completed}
                        onChange={() => toggleElement(list, el.id)}
                        className="mr-2 h-5 w-5 cursor-pointer"
                      />
                      <span className="flex-1">{el.text}</span>
                    </div>
                    <button
                      onClick={() => removeElement(list, el.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-500 hover:text-red-700"
                      title="Usuń produkt"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
                {list.elements.length === 0 && (
                  <li className="text-gray-400 text-sm italic">
                    Brak produktów na liście
                  </li>
                )}
              </ul>

              <AddElementForm onAdd={(text) => addElement(list, text)} />
            </li>
          );
        }

        return (
          <li
            key={list.id}
            className="py-4 px-4 my-2 sm:m-4 max-w-sm min-w-[300px] rounded-xl shadow flex flex-col hover:shadow-lg bg-card transition"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 mr-4">
                <h3 className="font-semibold text-lg">{list.name}</h3>
                {list.share && (
                  <p className="text-sm text-gray-500">
                    {list.share === userEmail && `Udostępnione przez ${list.user_email.split("@")[0]}`}
                    {list.user_email === userEmail && `Udostępnione: ${list.share.split("@")[0]}`}
                  </p>
                )}
              </div>
              <div className="flex gap-2 sm:gap-3">
                <EditButton onClick={() => handleEdit(list)} />
                <DeleteButton onClick={() => handleDelete(list.id || "")} />
              </div>
            </div>

            <ul className="list-none space-y-2 mb-3">
              {list.elements.map((el) => (
                <li
                  key={el.id}
                  className={`flex items-center justify-between group ${
                    el.completed ? "line-through text-gray-500" : ""
                  }`}
                >
                  <div className="flex items-center flex-1">
                    <input
                      type="checkbox"
                      checked={el.completed}
                      onChange={() => toggleElement(list, el.id)}
                      className="mr-2 h-5 w-5 cursor-pointer"
                    />
                    <span className="flex-1">{el.text}</span>
                  </div>
                  <button
                    onClick={() => removeElement(list, el.id)}
                    className="transition-opacity p-1 text-red-500 hover:text-red-700"
                    title="Usuń produkt"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
              {list.elements.length === 0 && (
                <li className="text-gray-400 text-sm italic">
                  Brak produktów na liście
                </li>
              )}
            </ul>

            <AddElementForm onAdd={(text) => addElement(list, text)} />
          </li>
        );
      })}

      {lists.length === 0 && (
        <li className="text-center text-gray-500 py-8 w-full">
          Brak list zakupów
        </li>
      )}
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
    <form onSubmit={handleSubmit} className="flex gap-2 mt-2 pt-2 border-t">
      <input
        type="text"
        placeholder="Nowy produkt"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1 border px-3 py-2 rounded focus:ring-2 focus:ring-primary"
      />
      <button
        className="flex items-center px-3 py-2 text-primary hover:text-secondary hover:underline transition"
        type="submit"
      >
        Dodaj
        <Plus className="w-4 h-4 ml-1" />
      </button>
    </form>
  );
}