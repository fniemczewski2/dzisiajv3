"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Loader2, PlusCircleIcon, Save } from "lucide-react";
import { Bill } from "../../types";
import { getPolishDateString } from "../../hooks/getPolishDate";

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

  const [amount, setAmount] = useState("0");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Warsaw",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date()); 
  });
  const [includeInBudget, setIncludeInBudget] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initial) {
      setAmount(String(initial.amount ?? "0"));
      setDescription(initial.description ?? "");
      setDate(initial.date);
      setIncludeInBudget(initial.include_in_budget);
    }
  }, [initial]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      user_name: userEmail,
      amount: parseFloat(amount) || 0,
      description: description.trim() || null,
      date: date,
      include_in_budget: includeInBudget,
    };

    if (isEdit && initial) {
      await supabase.from("bills").update(payload).eq("id", initial.id);
    } else {
      await supabase.from("bills").insert(payload);
    }

    setLoading(false);
    onChange();

    if (!isEdit) {
      // reset
      setAmount("0");
      setDescription("");
      setDate(getPolishDateString());
      setIncludeInBudget(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 bg-card p-4 rounded-xl shadow max-w-md"
    >
      <div>
        <label htmlFor="amount">Kwota:</label>
        <input
          id="amount"
          type="number"
          step="0.01"
          placeholder="Kwota"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label htmlFor="description">Opis:</label>
        <textarea
          id="description"
          placeholder="Opis"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label htmlFor="date">Data:</label>
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
          Planowany wydatek
        </label>
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
        {loading && <Loader2 className="animate-spin w-6 h-6 text-gray-500" />}
      </div>
    </form>
  );
}
