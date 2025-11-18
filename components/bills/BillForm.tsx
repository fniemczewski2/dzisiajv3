"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { PlusCircleIcon, Save } from "lucide-react";
import { Bill } from "../../types";
import { getAppDate } from "../../lib/dateUtils";
import { useBills } from "../../hooks/useBills";
import LoadingState from "../LoadingState";

interface BillFormProps {
  onChange: () => void;
  onCancel?: () => void;
  initial?: Bill;
}

export default function BillForm({
  onChange,
  onCancel,
  initial,
}: BillFormProps) {
  const isEdit = !!initial;
  const { addBill, editBill, loading } = useBills();

  const [amount, setAmount] = useState("0");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => {
    return initial?.date || getAppDate();
  });
  const [includeInBudget, setIncludeInBudget] = useState(false);

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

    const payload: Bill = {
      ...(isEdit && initial ? { id: initial.id } : {}),
      amount: parseFloat(amount) || 0,
      description: description.trim() || null,
      date: date,
      include_in_budget: includeInBudget,
      done: initial?.done ?? false,
    } as Bill;

    if (isEdit && initial) {
      await editBill(payload);
    } else {
      await addBill(payload);
    }

    onChange();

    if (!isEdit) {
      // reset
      setAmount("0");
      setDescription("");
      setDate(getAppDate());
      setIncludeInBudget(false);
    }

    if (onCancel) onCancel();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 bg-card p-4 rounded-xl shadow max-w-md"
    >
      <div>
        <label className="block text-sm font-medium" htmlFor="amount">
          Kwota:
        </label>
        <input
          id="amount"
          type="number"
          step="0.01"
          placeholder="Kwota"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-2 border rounded"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="description">
          Opis:
        </label>
        <textarea
          id="description"
          placeholder="Opis"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 border rounded"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="date">
          Data:
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full p-2 border rounded"
          required
          disabled={loading}
        />
      </div>

      <div className="flex items-center py-2 space-x-2">
        <input
          id="includeInBudget"
          type="checkbox"
          checked={includeInBudget}
          onChange={() => setIncludeInBudget(!includeInBudget)}
          className="h-4 w-4"
          disabled={loading}
        />
        <label
          className="block text-sm font-medium select-none"
          htmlFor="includeInBudget"
        >
          Planowany wydatek
        </label>
      </div>

      <div className="flex space-x-2 items-center">
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1 bg-primary hover:bg-secondary text-white rounded-lg flex flex-nowrap items-center transition disabled:opacity-50 disabled:cursor-not-allowed"
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