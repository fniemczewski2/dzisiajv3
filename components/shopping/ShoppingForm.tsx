"use client";

import { SyntheticEvent, useState } from "react";
import { useSettings } from "@/hooks/db/useSettings";
import { FormButtons } from "../ui/CommonButtons";
import { ShoppingList } from "@/types/shopping";
import { useRetry } from "@/lib/withRetry";

interface ShoppingFormProps {
  onChange: () => void;
  onCancel?: () => void;
  lists: ShoppingList[];
  loading: boolean;
  addShoppingList: (name: string, shared_with_email: string | null) => Promise<boolean>;
}

export default function ShoppingForm({ onChange, onCancel, lists, loading, addShoppingList }: Readonly<ShoppingFormProps>) {
  const { settings } = useSettings();
  const [name, setName] = useState("");
  const [share, setShare] = useState("");
  const userOptions = settings?.users ?? [];
  const retry = useRetry();

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    await retry(() => addShoppingList(name.trim(), share.trim() || null));
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
      </div>
      <FormButtons onClickClose={onCancel} loading={loading} />
    </form>
  );
}