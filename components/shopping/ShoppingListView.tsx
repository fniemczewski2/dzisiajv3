"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { Plus, Trash2, User } from "lucide-react";
import { ShoppingList } from "../../types";
import { useShoppingLists } from "../../hooks/useShoppingLists";
import { useSettings } from "../../hooks/useSettings";
import { EditButton, DeleteButton, SaveButton, CancelButton } from "../CommonButtons";
import NoResultsState from "../NoResultsState";

export default function ShoppingListView() {
  const { lists, deleteShoppingList, editShoppingList } = useShoppingLists();
  const { settings } = useSettings();
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [editedList, setEditedList] = useState<ShoppingList | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const userOptions = settings?.users ?? [];

  useEffect(() => {
    if (editingId && nameRef.current) {
      nameRef.current.focus();
    }
  }, [editingId]);

  // SORTOWANIE LIST ZAKUPÓW
  const sortedLists = useMemo(() => {
    const sortType = settings?.sort_shopping || "updated_desc";
    return [...lists].sort((a, b) => {
      if (sortType === "alphabetical") {
        return a.name.localeCompare(b.name, "pl");
      }
      const dateA = new Date((a as any).updated_at || (a as any).created_at || 0).getTime();
      const dateB = new Date((b as any).updated_at || (b as any).created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [lists, settings?.sort_shopping]);

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
        shared_with_id: editedList.shared_with_id,
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
    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedLists.map((list) => {
        const isEditing = editingId === list.id;

        if (isEditing && editedList) {
          return (
            <li
              key={list.id}
              className="p-5 break-inside-avoid card rounded-2xl shadow-lg space-y-4 animate-in fade-in"
            >
              <div className="space-y-4">
                <div>
                  <label className="form-label">Nazwa listy:</label>
                  <input ref={nameRef} type="text" value={editedList.name} onChange={(e) => setEditedList({ ...editedList, name: e.target.value })} className="input-field font-medium" />
                </div>
                <div>
                  <label className="form-label">Udostępnij dla:</label>
                  <select value={editedList.shared_with_id || ""} onChange={(e) => setEditedList({ ...editedList, shared_with_id: e.target.value || null })} className="input-field">
                    <option value="">Tylko dla mnie</option>
                    {userOptions.map((email) => (
                      <option key={email} value={id}>{email}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                  <SaveButton onClick={handleSaveEdit} type="button" />
                  <CancelButton onCancel={handleCancelEdit} />
                </div>
              </div>
              <ul className="list-none space-y-2.5 opacity-60 pointer-events-none grayscale-[0.5]">
                {list.elements.map((el) => (
                  <li key={el.id} className={`flex items-center justify-between ${el.completed ? "line-through text-textMuted" : "text-text"}`}>
                    <div className="flex items-center flex-1 gap-3">
                      <input type="checkbox" checked={el.completed} readOnly className="h-5 w-5 rounded text-primary focus:ring-primary accent-primary cursor-not-allowed card" />
                      <span className="flex-1 font-medium">{el.text}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          );
        }

        return (
          <li
            key={list.id}
            className="p-5 break-inside-avoid card rounded-2xl shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 mr-4 min-w-0">
                <h3 className="font-bold text-lg text-text leading-tight truncate">{list.name}</h3>
                {list.display_share_info && (
                  <div className="flex items-center text-sm font-medium text-textSecondary mt-2">
                    <User className="w-4 h-4 mr-1.5 text-blue-500" />
                    <span className="truncate">{list.display_share_info}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <EditButton onClick={() => handleEdit(list)} />
                <DeleteButton onClick={() => handleDelete(list.id || "")} />
              </div>
            </div>

            <ul className="list-none mb-4 flex-1">
              {list.elements.map((el) => (
                <li key={el.id} className={`flex items-center justify-between p-1.5 -mx-1.5 rounded-lg transition-colors hover:bg-surface ${el.completed ? "line-through text-textMuted" : "text-text"}`}>
                  <div className="flex items-center flex-1 gap-3 min-w-0">
                    <input type="checkbox" checked={el.completed} onChange={() => toggleElement(list, el.id)} className="h-5 w-5 shrink-0 rounded text-primary focus:ring-primary accent-primary cursor-pointer card transition-colors" />
                    <span className="flex-1 font-medium truncate">{el.text}</span>
                  </div>
                  <button onClick={() => removeElement(list, el.id)} className="p-1.5 text-red-500 hover:text-white hover:bg-red-500 rounded-md ml-2 shrink-0" title="Usuń produkt">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
              {list.elements.length === 0 && (
                <NoResultsState text="produktów na liście" />
              )}
            </ul>

            <div className="mt-auto">
              <AddElementForm onAdd={(text) => addElement(list, text)} />
            </div>
          </li>
        );
      })}

      {lists.length === 0 && (
        <NoResultsState text="list zakupów" />
      )}
    </ul>
  );
}

function AddElementForm({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAdd(text);
      setText("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
      <input
        type="text"
        placeholder="Nowy produkt..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="input-field py-2"
      />
      <button className="flex items-center justify-center px-4 bg-primary text-white font-bold rounded-xl hover:bg-secondary transition-colors shrink-0" type="submit" title="Dodaj produkt">
        <Plus className="w-5 h-5" />
      </button>
    </form>
  );
}