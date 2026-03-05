"use client";

import { ShoppingList } from "../../types";
import { useSettings } from "../../hooks/useSettings";
import { useShoppingLists } from "../../hooks/useShoppingLists";
import LoadingState from "../LoadingState";
import { AddButton, CancelButton } from "../CommonButtons";
import { useAuth } from "../../providers/AuthProvider";
import { SyntheticEvent, useState } from "react";

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
  const { user } = useAuth();
  const userId = user?.id;
  const [name, setName] = useState("");
  const [share, setShare] = useState("");
  const userOptions = settings?.users ?? [];

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    await addShoppingList(name.trim(), share.trim() || null);

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
        <AddButton loading={loading} />
        {onCancel && <CancelButton onCancel={onCancel} loading={loading} />}
        {loading && <LoadingState />}
      </div>
    </form>
  );
}