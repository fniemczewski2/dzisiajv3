"use client";

import React, { useEffect, useState, SyntheticEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { Bill } from "../../types";
import { getAppDate } from "../../lib/dateUtils";
import { useBills } from "../../hooks/useBills";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";
import LoadingState from "../LoadingState";
import { AddButton, SaveButton, CancelButton } from "../CommonButtons";

interface BillFormProps {
  onChange: () => void;
  onCancel?: () => void;
  initial?: Bill;
}

export default function BillForm({ onChange, onCancel, initial }: BillFormProps) {
  const isEdit = !!initial;
  const { user } = useAuth();
  const { addBill, editBill, loading } = useBills();
  const { toast } = useToast();

  const [amount, setAmount] = useState("0");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => initial?.date || getAppDate());
  const [isIncome, setIsIncome] = useState(false);

  useEffect(() => {
    if (initial) {
      setAmount(String(initial.amount ?? "0"));
      setDescription(initial.description ?? "");
      setDate(initial.date);
      setIsIncome(initial.is_income);
    }
  }, [initial]);

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const payload = {
      ...(isEdit && initial ? { id: initial.id } : {}),
      amount: parseFloat(amount) || 0,
      description: description.trim() || null,
      date,
      is_income: isIncome,
      done: initial?.done ?? false,
    } as Bill;

    await withRetry(
      () => isEdit ? editBill(payload) : addBill(payload),
      toast,
      { context: `BillForm.${isEdit ? "editBill" : "addBill"}`, userId: user?.id }
    );

    toast.success(isEdit ? "Zmieniono pomyślnie." : "Dodano pomyślnie.");
    onChange();

    if (!isEdit) {
      setAmount("0");
      setDescription("");
      setDate(getAppDate());
      setIsIncome(false);
    }

    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit} className="form-card max-w-md">
      <div>
        <label className="form-label" htmlFor="amount">Kwota:</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsIncome(!isIncome)}
            className={`p-2 rounded-lg transition-colors ${
              isIncome
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
            }`}
            disabled={loading}
            title={isIncome ? "Przychód" : "Wydatek"}
          >
            {isIncome ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
          </button>
          <input
            id="amount"
            type="number"
            step="0.01"
            placeholder="Kwota"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input-field flex-1"
            required
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label className="form-label" htmlFor="description">Opis:</label>
        <textarea
          id="description"
          placeholder="Krótki opis"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-field"
          rows={2}
          disabled={loading}
        />
      </div>

      <div>
        <label className="form-label" htmlFor="date">Data:</label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input-field w-full min-w-0 px-1 text-xs"
          required
          disabled={loading}
        />
      </div>

      <div className="flex space-x-2 items-center pt-2">
        {isEdit ? <SaveButton loading={loading} /> : <AddButton loading={loading} />}
        {onCancel && <CancelButton onCancel={onCancel} loading={loading} />}
        {loading && <LoadingState />}
      </div>
    </form>
  );
}