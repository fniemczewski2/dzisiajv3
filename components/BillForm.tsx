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
  const [includeInBudget, setIncludeInBudget] = useState(
    initial?.include_in_budget || false
  );
  const [loading, setLoading] = useState(false);
  const todayIso = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (initial) {
      setAmount(initial.amount);
      setDescription(initial.description || "");
      setDate(initial.date);
      setIncludeInBudget(initial.include_in_budget || false);
    }
  }, [initial]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      user_name: userEmail,
      amount,
      description: description || null,
      date: todayIso,
      include_in_budget: includeInBudget,
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
      setIncludeInBudget(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 bg-card p-4 rounded-xl shadow max-w-md"
    >
      <div>
        <label htmlFor="amount" className="w-full">
          Kwota:&nbsp;
        </label>
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
      </div>
      <div>
        <label htmlFor="description" className="w-full">
          Opis:&nbsp;
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Opis"
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label htmlFor="date" className="w-full">
          Data:&nbsp;
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div className="flex items-center py-2 space-x-2">
        <input
          id="includeInBudget"
          type="checkbox"
          checked={includeInBudget}
          onChange={() => setIncludeInBudget(!includeInBudget)}
          className="h-4 w-4"
        />
        <label htmlFor="includeInBudget" className="select-none">
          Uwzględnij w budżecie
        </label>
      </div>

      <div className="flex space-x-2 items-center">
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-white rounded-lg"
        >
          {isEdit ? "Zapisz" : "Dodaj"}
        </button>
        {typeof onCancel === "function" && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 rounded-lg"
          >
            Anuluj
          </button>
        )}
        {loading && <Loader2 className="animate-spin w-6 h-6 text-gray-500" />}
      </div>
    </form>
  );
}
