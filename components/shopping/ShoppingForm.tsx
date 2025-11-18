"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { PlusCircleIcon, Save } from "lucide-react";
import { ShoppingList } from "../../types";
import { useSettings } from "../../hooks/useSettings";
import { useShoppingLists } from "../../hooks/useShoppingLists";
import LoadingState from "../LoadingState";
import { useSession } from "@supabase/auth-helpers-react";

interface ShoppingFormProps {
  onChange: () => void;
  onCancel?: () => void;
}

export default function ShoppingForm({
  onChange,
  onCancel,
}: ShoppingFormProps) {
  const { settings } = useSettings();
  const { addShoppingList, loading } = useShoppingLists();
  const session  = useSession();
  const userEmail = session?.user.email;
  const [name, setName] = useState("");
  const [share, setShare] = useState("");
  const userOptions = settings?.users ?? [];
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const payload: ShoppingList = {
      user_email: userEmail,
      name: name.trim() || "",
      share: share.trim() || null,
      elements:  [],
    } as ShoppingList;


    await addShoppingList(payload.name, payload.share);

    onChange();
    setName("");
    setShare("");

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
              Dodaj&nbsp;
              <PlusCircleIcon className="w-5 h-5" />
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