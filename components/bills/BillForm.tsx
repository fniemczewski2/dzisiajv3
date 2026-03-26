"use client";
// components/bills/BillForm.tsx

import React, { useEffect, useState, SyntheticEvent } from "react";
import { Minus, Plus, RefreshCw } from "lucide-react";
import { format, endOfYear } from "date-fns";
import { getAppDate } from "../../lib/dateUtils";
import { useBills } from "../../hooks/useBills";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";
import { FormButtons } from "../CommonButtons";
import type { Bill, BudgetCategory } from "../../types";

interface BillFormProps {
  onChange: () => void;
  onCancel?: () => void;
  initial?: Bill;
  categories: BudgetCategory[];
}

export default function BillForm({
  onChange,
  onCancel,
  initial,
  categories
}: Readonly<BillFormProps>) {
  const isEdit = !!initial;
  const { user } = useAuth();
  const { addBill, editBill, loading } = useBills();
  const { toast } = useToast();

  const yearEnd = format(endOfYear(new Date()), "yyyy-MM-dd");

  const [amount, setAmount] = useState("0");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => initial?.date || getAppDate());
  const [isIncome, setIsIncome] = useState(false);
  const [categoryId, setCategoryId] = useState<string>("");      
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringUntil, setRecurringUntil] = useState(yearEnd);
  const [updateFuture, setUpdateFuture] = useState(false);       

  useEffect(() => {
    if (initial) {
      setAmount(String(initial.amount ?? "0"));
      setDescription(initial.description ?? "");
      setDate(initial.date);
      setIsIncome(initial.is_income);
      setCategoryId(initial.category_id ?? "");
      setIsRecurring(initial.is_recurring ?? false);
      setRecurringUntil(initial.recurring_until ?? yearEnd);
    }
  }, [initial]);

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const payload = {
      amount:          Number.parseFloat(amount) || 0,
      description:     description.trim() || null,
      date,
      is_income:       isIncome,
      done:            initial?.done ?? false,
      category_id:     categoryId || null,
      is_recurring:    isRecurring,
      recurring_until: isRecurring ? recurringUntil : null,
    } as Omit<Bill, "id" | "user_id" | "parent_bill_id">;

    if (isEdit && initial) {
      await withRetry(
        () => editBill({ ...initial, ...payload }, { updateFutureRecurring: updateFuture }),
        toast,
        { context: "BillForm.editBill", userId: user?.id }
      );
    } else {
      await withRetry(
        () => addBill(payload),
        toast,
        { context: "BillForm.addBill", userId: user?.id }
      );
    }

    toast.success(isEdit ? "Zmieniono pomyślnie." : "Dodano pomyślnie.");

    if (!isEdit) {
      setAmount("0");
      setDescription("");
      setDate(getAppDate());
      setIsIncome(false);
      setCategoryId("");
      setIsRecurring(false);
      setRecurringUntil(yearEnd);
    }

    onChange();
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
        <input
          id="description"
          type="text"
          placeholder="Krótki opis"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-field"
          disabled={loading}
        />
      </div>

      {/* ZMIANA: Usunięto warunek `!isIncome &&`, kategoria jest zawsze widoczna */}
      <div>
        <label className="form-label" htmlFor="category">Kategoria:</label>
        <select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="input-field"
          disabled={loading}
        >
          <option value="">Inne (bez kategorii)</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
              {cat.is_monthly
                ? ` (${cat.amount.toFixed(0)} zł/mies.)`
                : ` (${cat.amount.toFixed(0)} zł/rok)`}
            </option>
          ))}
        </select>
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

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-3 bg-surface">
          <label htmlFor="cycle" className="flex items-center justify-between gap-3 cursor-pointer">
            <span id="cycle" className="flex items-center gap-2 text-sm font-medium text-text">
              <RefreshCw className="w-4 h-4 text-primary" />
              Cykliczny (co miesiąc)
            </span>
                        <button
              type="button"
              onClick={() => setIsRecurring(!isRecurring)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                isRecurring ? "bg-primary" : "bg-gray-300 dark:bg-gray-700"
              }`}
              role="switch"
              aria-checked={isRecurring}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${
                  isRecurring ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </label>
            <div>
              <label className="form-label" htmlFor="until">
                Powtarzaj do:
              </label>
              <input
                id="until"
                type="date"
                value={recurringUntil}
                min={date}
                max={`${new Date().getFullYear()}-12-31`}
                onChange={(e) => setRecurringUntil(e.target.value)}
                className="input-field w-full min-w-0 px-1 text-xs"
                disabled={loading}
              />
            </div>
          

          {isEdit && initial?.is_recurring && (
            <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
              <input
                type="checkbox"
                checked={updateFuture}
                onChange={(e) => setUpdateFuture(e.target.checked)}
                className="h-4 w-4 rounded accent-primary"
              />
              Zastosuj zmiany do przyszłych powtórzeń
            </label>
          )}
        </div>
        <FormButtons onClickClose={onCancel} loading={loading}/>
    </form>
  );
}