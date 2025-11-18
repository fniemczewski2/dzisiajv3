"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { PlusCircleIcon, Save } from "lucide-react";
import { ShoppingList } from "../../types";
import { useSettings } from "../../hooks/useSettings";
import { useShoppingLists } from "../../hooks/useShoppingLists";
import LoadingState from "../LoadingState";

interface ShoppingFormProps {
  userEmail: string;
  onChange: () => void;
  onCancel?: () => void;
  initial?: ShoppingList;
}

export default function ShoppingForm({
  userEmail,
  onChange,
  onCancel,
  initial,
}: ShoppingFormProps) {
  const { settings } = useSettings();
  const { addShoppingList, editShoppingList, loading } = useShoppingLists();
  const isEdit = !!initial;

  const [name, setName] = useState("");
  const [share, setShare] = useState("");
  const userOptions = settings?.users ?? [];

  useEffect(() => {
    if (initial) {
      setName(initial.name ?? "");
      setShare(initial.share ?? "");
    } else {
      setName("");
      setShare("");
    }
  }, [initial]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const payload: ShoppingList = {
      ...(isEdit && initial ? { id: initial.id } : {}),
      user_email: userEmail,
      name: name.trim(),
      share: share.trim() || null,
      elements: initial?.elements ?? [],
    } as ShoppingList;

    if (isEdit && initial) {
      await editShoppingList(initial.id, payload);
    } else {
      await addShoppingList(payload.name, payload.share);
    }

    onChange();

    if (!isEdit) {
      setName("");
      setShare("");
    }

    if (onCancel) onCancel();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-card p-4 rounded-xl shadow max-w-md"
    >
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Nazwa:
        </label>
        <input
          id="name"
          type="text"
          placeholder="Nazwa listy zakupów"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="share" className="block text-sm font-medium mb-1">
          Udostępnij:
        </label>
        <select
          id="share"
          value={share || ""}
          onChange={(e) => setShare(e.target.value)}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
          disabled={loading}
        >
          <option value="">Tylko dla mnie</option>
          {userOptions.map((email) => (
            <option key={email} value={email}>
              {email}
            </option>
          ))}
        </select>
      </div>

      <div className="flex space-x-2 items-center">
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1 bg-primary hover:bg-secondary text-white rounded-lg flex flex-nowrap items-center transition disabled:opacity-50 disabled:cursor-not-allowed"
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
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1 bg-gray-300 rounded-lg hover:bg-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anuluj
          </button>
        )}
        {loading && <LoadingState />}
      </div>
    </form>
  );
}