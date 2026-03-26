"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Plus, User } from "lucide-react";
import { ShoppingList } from "../../types";
import { useSettings } from "../../hooks/useSettings";
import { useAuth } from "../../providers/AuthProvider";
import { useToast } from "../../providers/ToastProvider";
import { withRetry } from "../../lib/withRetry";
import { EditButton, DeleteButton, FormButtons } from "../CommonButtons";
import NoResultsState from "../NoResultsState";

interface ShoppingListViewProps {
  lists: ShoppingList[];
  editShoppingList: (id: string, updates: any) => Promise<void>;
  deleteShoppingList: (id: string) => Promise<void>;
}

export default function ShoppingListView({ lists, editShoppingList, deleteShoppingList }: Readonly<ShoppingListViewProps>) {
  const { settings } = useSettings();
  const { user, supabase } = useAuth();
  const { toast } = useToast();

  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [editedList, setEditedList] = useState<ShoppingList | null>(null);
  const [sharedEmail, setSharedEmail] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const userOptions = settings?.users ?? [];
  const retryOpts = { userId: user?.id };

  useEffect(() => {
    if (editingId && nameRef.current) nameRef.current.focus();
  }, [editingId]);

  const sortedLists = useMemo(() => {
    const sortType = settings?.sort_shopping || "updated_desc";
    return [...lists].sort((a, b) => {
      if (sortType === "alphabetical") return a.name.localeCompare(b.name, "pl");
      return (
        new Date((b as any).updated_at || (b as any).created_at || 0).getTime() -
        new Date((a as any).updated_at || (a as any).created_at || 0).getTime()
      );
    });
  }, [lists, settings?.sort_shopping]);

  const handleEdit = async (list: ShoppingList) => {
    setEditingId(list.id);
    setEditedList({ ...list });
    
    const isOwner = list.user_id === user?.id;
    
    if (isOwner && list.shared_with_id) {
      const { data, error } = await supabase.rpc("get_email_by_user_id", {
        target_uuid: list.shared_with_id,
      });
      setSharedEmail(!error && data ? data : "");
    } else {
      setSharedEmail("");
    }
  };

  const handleCancelEdit = () => { 
    setEditingId(undefined); 
    setEditedList(null); 
    setSharedEmail(""); 
  };

  const handleSaveEdit = async () => {
    if (!editedList?.id) return;
    
    const isOwner = editedList.user_id === user?.id;
    const updates: any = { name: editedList.name };
    
    if (isOwner) {
      updates.shared_with_email = sharedEmail;
    }

    await withRetry(
      () => editShoppingList(editedList.id!, updates),
      toast,
      { context: "ShoppingListView.editShoppingList", ...retryOpts }
    );
    
    toast.success("Zmieniono pomyślnie.");
    setEditingId(undefined); 
    setEditedList(null); 
    setSharedEmail("");
  };

  // ZMIANA: Obsługa usuwania w zależności od tego, czy jesteśmy właścicielem
  const handleDelete = async (list: ShoppingList) => {
    const isOwner = list.user_id === user?.id;

    if (isOwner) {
      const ok = await toast.confirm("Czy na pewno chcesz trwale usunąć tę listę zakupów?");
      if (!ok) return;
      await withRetry(
        () => deleteShoppingList(list.id!),
        toast,
        { context: "ShoppingListView.deleteShoppingList", ...retryOpts }
      );
      toast.success("Usunięto pomyślnie.");
    } else {
      const ok = await toast.confirm("Czy na pewno chcesz opuścić tę listę? Zniknie ona z Twojego widoku.");
      if (!ok) return;
      // Gość "usuwa" listę u siebie poprzez przypisanie shared_with_id z powrotem do właściciela
      await withRetry(
        () => editShoppingList(list.id!, { shared_with_id: list.user_id }),
        toast,
        { context: "ShoppingListView.leaveShoppingList", ...retryOpts }
      );
      toast.success("Opuszczono listę.");
    }
  };

  const toggleElement = (list: ShoppingList, elId: string) => {
    const updated = list.elements.map((el) => el.id === elId ? { ...el, completed: !el.completed } : el);
    if (list.id) editShoppingList(list.id, { elements: updated }).catch(console.error);
  };

  const addElement = (list: ShoppingList, text: string) => {
    if (!text.trim()) return;
    const updated = [...list.elements, { id: crypto.randomUUID(), text: text.trim(), completed: false }];
    if (list.id) editShoppingList(list.id, { elements: updated }).catch(console.error);
  };

  const removeElement = (list: ShoppingList, elId: string) => {
    const updated = list.elements.filter((el) => el.id !== elId);
    if (list.id) editShoppingList(list.id, { elements: updated }).catch(console.error);
  };

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedLists.map((list) => {
        const isEditing = editingId === list.id;
        const isOwner = list.user_id === user?.id;

        if (isEditing && editedList) {
          return (
            <li key={list.id} className="p-5 break-inside-avoid card rounded-2xl shadow-lg space-y-4 animate-in fade-in">
              <div className="space-y-4">
                <div>
                  <label className="form-label">Nazwa listy:</label>
                  <input ref={nameRef} type="text" value={editedList.name}
                    onChange={(e) => setEditedList({ ...editedList, name: e.target.value })}
                    className="input-field font-medium" />
                </div>
                {isOwner && userOptions.length > 0 && (
                  <div>
                    <label className="form-label">Udostępnij dla:</label>
                    <select value={sharedEmail} onChange={(e) => setSharedEmail(e.target.value)} className="input-field">
                      <option value="">Tylko dla mnie</option>
                      {userOptions.map((email) => <option key={email} value={email}>{email}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                  <FormButtons onClickSave={handleSaveEdit} onClickClose={handleCancelEdit} />
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
          <li key={list.id} className="p-5 break-inside-avoid card rounded-2xl shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
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
                <DeleteButton onClick={() => handleDelete(list)} />
              </div>
            </div>
            <ul className="list-none mb-4 flex-1 space-y-1">
              {list.elements.map((el) => (
                <li key={el.id} className={`flex items-center justify-between p-1.5 -mx-1.5 rounded-lg transition-colors hover:bg-surface ${el.completed ? "line-through text-textMuted" : "text-text"}`}>
                  <div className="flex items-center flex-1 gap-3 min-w-0">
                    <input type="checkbox" checked={el.completed} onChange={() => toggleElement(list, el.id)}
                      className="h-5 w-5 shrink-0 rounded text-primary focus:ring-primary accent-primary cursor-pointer card transition-colors" />
                    <span className="flex-1 font-medium truncate">{el.text}</span>
                  </div>
                  <DeleteButton onClick={() => removeElement(list, el.id)} small />
                </li>
              ))}
              {list.elements.length === 0 && <div className="mt-4"><NoResultsState text="produktów na liście" /></div>}
            </ul>
            <div className="mt-auto">
              <AddElementForm onAdd={(text) => addElement(list, text)} />
            </div>
          </li>
        );
      })}
      {lists.length === 0 && <div className="col-span-full"><NoResultsState text="list zakupów" /></div>}
    </ul>
  );
}

function AddElementForm({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (text.trim()) { onAdd(text); setText(""); }
  };
  return (
    <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
      <input type="text" placeholder="Nowy produkt..." value={text}
        onChange={(e) => setText(e.target.value)} className="input-field py-2 flex-1 min-w-0" />
      <button className="flex items-center justify-center px-4 bg-primary text-white font-bold rounded-xl hover:bg-secondary transition-colors shrink-0" type="submit" title="Dodaj produkt">
        <Plus className="w-5 h-5" />
      </button>
    </form>
  );
}