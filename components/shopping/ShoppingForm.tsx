"use client";

import { SyntheticEvent, useState } from "react";
import { useSettings } from "../../hooks/useSettings";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";
import LoadingState from "../LoadingState";
import { AddButton, CancelButton } from "../CommonButtons";
import { ShoppingList } from "../../types";

interface ShoppingFormProps {
  onChange: () => void;
  onCancel?: () => void;
  lists: ShoppingList[];
  loading: boolean;
  addShoppingList: (name: string, shared_with_email: string | null) => Promise<boolean>;
}

const MAX_LISTS = 5;

export default function ShoppingForm({ onChange, onCancel, lists, loading, addShoppingList }: ShoppingFormProps) {
  const { settings } = useSettings();
  const { toast } = useToast();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [share, setShare] = useState("");
  const userOptions = settings?.users ?? [];

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (lists.length >= MAX_LISTS) {
      toast.error(`Możesz mieć maksymalnie ${MAX_LISTS} list zakupów.`);
      return;
    }

    await withRetry(
      () => addShoppingList(name.trim(), share.trim() || null),
      toast,
      { context: "ShoppingForm.addShoppingList", userId: user?.id }
    );

    toast.success("Dodano pomyślnie.");
    setName(""); setShare("");
    onChange();
    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit} className="form-card max-w-md">
      <div>
        <label htmlFor="name" className="form-label">Nazwa listy:</label>
        <input id="name" type="text" placeholder="np. Zakupy na weekend"
          value={name} onChange={(e) => setName(e.target.value)}
          className="input-field" required disabled={loading} />
      </div>
      <div>
        <label htmlFor="share" className="form-label">Udostępnij listę:</label>
        <select id="share" value={share} onChange={(e) => setShare(e.target.value)}
          className="input-field" disabled={loading}>
          <option value="">Tylko dla mnie</option>
          {userOptions.map((email) => <option key={email} value={email}>{email}</option>)}
        </select>
        <p className="text-xs text-textSubtle mt-1.5">
          Osoby, którym udostępnisz listę, będą mogły dodawać i odhaczać na niej produkty.
        </p>
      </div>
      <div className="flex space-x-3 items-center pt-2">
        <AddButton loading={loading} />
        {onCancel && <CancelButton onClick={onCancel} loading={loading} />}
        {loading && <LoadingState />}
      </div>
    </form>
  );
}