"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Loader2, PlusCircleIcon, Save } from "lucide-react";
import { ShoppingList } from "../../types";
import { useSettings } from "../../hooks/useSettings";

interface ShoppingFormProps {
  userEmail: string;
  onChange: () => void;
  onCancel?: () => void;
  initial?: ShoppingList;
}

export function ShoppingForm({
  userEmail,
  onChange,
  onCancel,
  initial,
}: ShoppingFormProps) {
  const { settings } = useSettings(userEmail);
  const supabase = useSupabaseClient();
  const isEdit = !!initial;

  const [name, setName] = useState("");
  const [share, setShare] = useState("");
  const [loading, setLoading] = useState(false);
  const userOptions = settings?.users ?? [];

  useEffect(() => {
    if (initial) {
      setName(initial.name ?? "");
      setShare(initial.share ?? "");
    }
  }, [initial]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      user_email: userEmail,
      name: name.trim(),
      share: share.trim() || null,
      elements: initial?.elements ?? [],
    };

    if (isEdit && initial) {
      await supabase.from("shopping_lists").update(payload).eq("id", initial.id);
    } else {
      await supabase.from("shopping_lists").insert(payload);
    }

    setLoading(false);
    onChange();

    if (!isEdit) {
      // reset
      setName("");
      setShare("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 bg-card p-4 rounded-xl shadow max-w-md"
    >
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Nazwa:
        </label>
        <input
          id="name"
          type="text"
          placeholder="Nazwa listy"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label
          htmlFor="for"
          className="block text-sm font-medium text-gray-700"
        >
          Udostępnij:
        </label>
        <select
          id="for"
          value={share || userEmail}
          onChange={(e) => setShare(e.target.value)}
          className="mt-1 w-full p-2 border rounded"
          required
        >
          <option value={userEmail}>tylko dla mnie</option>
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
          className="px-3 py-1 bg-primary hover:bg-secondary text-white rounded-lg flex flex-nowrap items-center transition"
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
            className="px-3 py-1 bg-gray-300 rounded-lg hover:bg-gray-400 transition"
          >
            Anuluj
          </button>
        )}
        {loading && <Loader2 className="animate-spin w-5 h-5 text-gray-500" />}
      </div>
    </form>
  );
}
