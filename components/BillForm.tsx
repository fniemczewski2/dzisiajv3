"use client";
import React, { useState, FormEvent, useEffect } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Loader2 } from "lucide-react";
import { Bill } from "../types";

interface BillFormProps {
  userEmail: string;
  onChange: () => void;
  onCancel?: () => void;
  initial?: Bill;
}

export function BillForm({
  userEmail,
  onChange,
  onCancel,
  initial,
}: BillFormProps) {
  const supabase = useSupabaseClient();
  const isEdit = !!initial;
  const [amount, setAmount] = useState(initial?.amount || 0);
  const [description, setDescription] = useState(initial?.description || "");
  const [date, setDate] = useState(initial?.date || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initial) {
      setAmount(initial.amount);
      setDescription(initial.description || "");
      setDate(initial.date);
    }
  }, [initial]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      user_name: userEmail,
      amount,
      description: description || null,
      date,
    };

    if (isEdit) {
      await supabase.from("bills").update(payload).eq("id", initial!.id);
    } else {
      await supabase.from("bills").insert(payload);
    }

    setLoading(false);
    onChange();
    if (!isEdit) {
      setAmount(0);
      setDescription("");
      setDate("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-card p-4 rounded-xl shadow max-w-md"
    >
      <label htmlFor="amount">Kwota:</label>
      <input
        id="amount"
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(parseFloat(e.target.value))}
        placeholder="Kwota"
        className="w-full p-2 border rounded"
        required
      />
      <label htmlFor="description">Opis:</label>
      <textarea
        id="decription"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Opis"
        className="w-full p-2 border rounded"
      />
      <label htmlFor="date">Data:</label>
      <input
        id="date"
        type="date"
        placeholder="dd.mm.rrrr"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full p-2 border rounded"
        required
      />
      <div className="flex space-x-2 items-center">
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-white rounded-xl"
        >
          {isEdit ? "Zapisz" : "Dodaj"}
        </button>
        {typeof onCancel === "function" && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 rounded-xl"
          >
            Anuluj
          </button>
        )}
        {loading && <Loader2 className="animate-spin w-6 h-6 text-gray-500" />}
      </div>
    </form>
  );
}
