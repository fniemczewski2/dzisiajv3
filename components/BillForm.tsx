"use client";

import React, { useRef, useEffect, useState, FormEvent } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Loader2, PlusCircleIcon, Save } from "lucide-react";
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

  const amountRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const [includeInBudget, setIncludeInBudget] = useState(
    initial?.include_in_budget || false
  );
  const [loading, setLoading] = useState(false);
  const todayIso = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (initial) {
      if (amountRef.current) amountRef.current.value = String(initial.amount);
      if (descriptionRef.current)
        descriptionRef.current.value = initial.description || "";
      if (dateRef.current) dateRef.current.value = initial.date;
      setIncludeInBudget(initial.include_in_budget);
    } else {
      if (amountRef.current) amountRef.current.value = "0";
      if (descriptionRef.current) descriptionRef.current.value = "";
      if (dateRef.current) dateRef.current.value = todayIso;
      setIncludeInBudget(false);
    }
  }, [initial, todayIso]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const amount = parseFloat(amountRef.current?.value || "0");
    const description = descriptionRef.current?.value.trim() || null;
    const date = dateRef.current?.value || todayIso;

    const payload = {
      user_name: userEmail,
      amount,
      description,
      date,
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
      if (amountRef.current) amountRef.current.value = "0";
      if (descriptionRef.current) descriptionRef.current.value = "";
      if (dateRef.current) dateRef.current.value = todayIso;
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
          ref={amountRef}
          id="amount"
          type="number"
          step="0.01"
          placeholder="Kwota"
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label htmlFor="description">Opis:</label>
        <textarea
          ref={descriptionRef}
          id="description"
          placeholder="Opis"
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label htmlFor="date">Data:</label>
        <input
          ref={dateRef}
          id="date"
          type="date"
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
          className="px-4 py-2 bg-primary hover:bg-secondary text-white rounded-lg flex flex-nowrap items-center"
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
        {typeof onCancel === "function" && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 flex flex-nowrap items-center rounded-lg"
          >
            Anuluj
          </button>
        )}
        {loading && <Loader2 className="animate-spin w-6 h-6 text-gray-500" />}
      </div>
    </form>
  );
}
