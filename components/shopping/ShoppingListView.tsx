// components/shopping/ShoppingListView.tsx

import React, { useState, useRef, useEffect, useMemo } from "react";
import { User } from "lucide-react";
import { ShoppingElement, ShoppingList } from "@/types/shopping";
import { useSettings } from "@/hooks/db/useSettings";
import { useAuth } from "@/providers/AuthProvider";
import { EditButton, DeleteButton, FormButtons, SaveButton } from "../ui/CommonButtons";
import NoResultsState from "../ui/NoResultsState";

interface ShoppingListViewProps {
  lists: ShoppingList[];
  editShoppingList: (id: string, updates: Partial<ShoppingList> & { shared_with_email?: string }) => Promise<void>;
  /** Zmiana pozycji – od razu na ekranie, zapis w tle. */
  updateElements: (id: string, change: (elements: ShoppingElement[]) => ShoppingElement[]) => void;
  deleteShoppingList: (id: string) => Promise<void>;
  loading: boolean;
}

export default function ShoppingListView({
  lists,
  editShoppingList,
  updateElements,
  deleteShoppingList,
  loading,
}: Readonly<ShoppingListViewProps>) {
  const { settings } = useSettings();
  const { user, supabase } = useAuth();
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [editedList, setEditedList] = useState<ShoppingList | null>(null);
  const [sharedEmail, setSharedEmail] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const userOptions = settings?.users ?? [];

  useEffect(() => {
    if (editingId && nameRef.current) nameRef.current.focus();
  }, [editingId]);

  const sortedLists = useMemo(() => {
    const sortType = settings?.sort_shopping || "updated_desc";
    return [...lists].sort((a, b) => {
      if (sortType === "alphabetical") return a.name.localeCompare(b.name, "pl");
      return (
        new Date(b.updated_at || b.inserted_at || 0).getTime() - new Date(a.updated_at || a.inserted_at || 0).getTime()
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
    const updates: Partial<ShoppingList> & { shared_with_email?: string } = { name: editedList.name };

    if (isOwner) {
      updates.shared_with_email = sharedEmail;
    }

    const listId = editedList.id;

    await editShoppingList(listId, updates);

    setEditingId(undefined);
    setEditedList(null);
    setSharedEmail("");
  };

  const handleDelete = async (list: ShoppingList) => {
    await deleteShoppingList(list.id!);
  };

  const toggleElement = (list: ShoppingList, elId: string) => {
    if (list.id)
      updateElements(list.id, (els) => els.map((el) => (el.id === elId ? { ...el, completed: !el.completed } : el)));
  };

  const addElement = (list: ShoppingList, text: string) => {
    if (!text.trim() || !list.id) return;
    updateElements(list.id, (els) => [...els, { id: crypto.randomUUID(), text: text.trim(), completed: false }]);
  };

  const removeElement = (list: ShoppingList, elId: string) => {
    if (list.id) updateElements(list.id, (els) => els.filter((el) => el.id !== elId));
  };

  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sortedLists.map((list) => {
        const isEditing = editingId === list.id;
        const isOwner = list.user_id === user?.id;

        if (isEditing && editedList) {
          return (
            <li
              key={list.id}
              className="card animate-in break-inside-avoid space-y-4 rounded-card p-5 shadow-lg fade-in"
            >
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="form-label">
                    Nazwa listy:
                  </label>
                  <input
                    id="name"
                    ref={nameRef}
                    type="text"
                    value={editedList.name}
                    onChange={(e) => setEditedList({ ...editedList, name: e.target.value })}
                    className="input-field font-medium"
                  />
                </div>
                {isOwner && userOptions.length > 0 && (
                  <div>
                    <label htmlFor="share" className="form-label">
                      Udostępnij dla:
                    </label>
                    <select
                      id="share"
                      value={sharedEmail}
                      onChange={(e) => setSharedEmail(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Tylko dla mnie</option>
                      {userOptions.map((email) => (
                        <option key={email} value={email}>
                          {email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <FormButtons onClickSave={handleSaveEdit} onClickClose={handleCancelEdit} loading={loading} />
              </div>
              <ul className="pointer-events-none list-none space-y-2.5 opacity-60 grayscale-[0.5]">
                {list.elements.map((el) => (
                  <li
                    key={el.id}
                    className={`flex items-center justify-between ${el.completed ? "text-text-muted line-through" : "text-text"}`}
                  >
                    <div className="flex flex-1 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={el.completed}
                        readOnly
                        className="card h-5 w-5 cursor-not-allowed rounded-lg text-primary accent-primary focus:ring-primary"
                      />
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
            className="card group flex h-full break-inside-avoid flex-col rounded-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="mr-4 min-w-0 flex-1">
                <h3 className="truncate text-lg leading-tight font-bold text-text">{list.name}</h3>
                {list.display_share_info && (
                  <div className="mt-2 flex items-center text-sm font-medium text-text-secondary">
                    <User className="mr-1.5 h-4 w-4 text-primary" />
                    <span className="truncate">{list.display_share_info}</span>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 gap-1.5">
                <EditButton onClick={() => handleEdit(list)} />
                <DeleteButton
                  onClick={() => handleDelete(list)}
                  ariaLabel={isOwner ? "usuń listę" : "wypisz się z listy"}
                />
              </div>
            </div>
            <ul className="mb-4 flex-1 list-none space-y-1">
              {list.elements.map((el) => (
                <li
                  key={el.id}
                  className={`-mx-1.5 flex items-center justify-between rounded-lg p-1.5 transition-colors hover:bg-surface ${el.completed ? "text-text-muted line-through" : "text-text"}`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={el.completed}
                      onChange={() => toggleElement(list, el.id)}
                      className="card h-5 w-5 shrink-0 cursor-pointer rounded-lg text-primary accent-primary transition-colors focus:ring-primary"
                    />
                    <span className="flex-1 truncate font-medium">{el.text}</span>
                  </div>
                  <DeleteButton onClick={() => removeElement(list, el.id)} small ariaLabel={`Usuń ${el.text}`} />
                </li>
              ))}
              {list.elements.length === 0 && (
                <div className="mt-4">
                  <NoResultsState text="produktów na liście" />
                </div>
              )}
            </ul>
            <div className="mt-auto">
              <AddElementForm onAdd={(text) => addElement(list, text)} />
            </div>
          </li>
        );
      })}
      {lists.length === 0 && (
        <div className="col-span-full">
          <NoResultsState text="list zakupów" />
        </div>
      )}
    </ul>
  );
}

function AddElementForm({ onAdd }: Readonly<{ onAdd: (text: string) => void }>) {
  const [text, setText] = useState("");
  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAdd(text);
      setText("");
    }
  };
  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-t border-line pt-4">
      <input
        type="text"
        aria-label="Nowy produkt"
        placeholder="Nowy produkt…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="input-field min-w-0 py-2"
      />
      <SaveButton small ariaLabel="Dodaj produkt" />
    </form>
  );
}
