"use client";

import { SyntheticEvent, useState } from "react";
import { useSettings } from "../../hooks/useSettings";
import { useShoppingLists } from "../../hooks/useShoppingLists";
import LoadingState from "../LoadingState";
import { AddButton, CancelButton } from "../CommonButtons";

interface ShoppingFormProps {
  onChange: () => void;
  onCancel?: () => void;
}

export default function ShoppingForm({ onChange, onCancel }: ShoppingFormProps) {
  const { settings } = useSettings();
  const { addShoppingList, loading } = useShoppingLists();  
  const [name, setName] = useState("");
  const [share, setShare] = useState("");
  const userOptions = settings?.users ?? [];

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    await addShoppingList(name.trim(), share.trim() || null);
    onChange();
    setName("");
    setShare("");
    if (onCancel) onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="form-card max-w-md">
      <div>
        <label htmlFor="name" className="form-label">Nazwa listy:</label>
        <input
          id="name"
          type="text"
          placeholder="np. Zakupy na weekend"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="share" className="form-label">Udostępnij listę:</label>
        <select
          id="share"
          value={share}
          onChange={(e) => setShare(e.target.value)}
          className="input-field"
          disabled={loading}
        >
          <option value="">Tylko dla mnie</option>
          {userOptions.map((email) => (
            <option key={email} value={email}>{email}</option>
          ))}
        </select>
        <p className="text-xs text-textSubtle mt-1.5">
          Osoby, którym udostępnisz listę, będą mogły dodawać i odhaczać na niej produkty.
        </p>
      </div>

      <div className="flex space-x-3 items-center pt-2">
        <AddButton loading={loading} />
        {onCancel && <CancelButton onCancel={onCancel} loading={loading} />}
        {loading && <LoadingState />}
      </div>
    </form>
  );
}