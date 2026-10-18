// components/budget/BudgetCategoriesEditor.tsx

import React, { useState, useRef, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useBudgetCategories } from "@/hooks/db/useBudgetCategories";

import { propagateMonthlyLimits } from "@/lib/budgetUtils";
import { EditButton, DeleteButton, FormButtons, AddButton } from "../ui/CommonButtons";
import type { BudgetCategory } from "@/types/bills";
import { MAX_CATEGORIES } from "@/config/limits";

interface AmountEditorProps {
  cat: BudgetCategory;
  onSave: (updates: Pick<BudgetCategory, "name" | "monthly_amounts" | "is_monthly">) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  selectedMonth: number;
}

interface AddCategoryFormProps {
  onAdd: (name: string) => Promise<void>;
  saving: boolean;
  onCancel: () => void;
}

function AddCategoryForm({ onAdd, saving, onCancel }: Readonly<AddCategoryFormProps>) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onAdd(name.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="text"
        placeholder="Nazwa kategorii…"
        aria-label="Nazwa kategorii"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="input-field flex-1 py-2"
        disabled={saving}
      />
      <FormButtons loading={saving} disabled={!name.trim()} onClickClose={onCancel} />
    </form>
  );
}

function AmountEditor({ cat, onSave, onCancel, saving, selectedMonth }: Readonly<AmountEditorProps>) {
  const currentVal = cat.is_monthly ? cat.monthly_amounts?.[selectedMonth] || 0 : cat.monthly_amounts?.[0] || 0;

  const [amount, setAmount] = useState(currentVal > 0 ? String(currentVal) : "");
  const [isMonthly, setIsMonthly] = useState(cat.is_monthly);

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const numAmount = Number.parseFloat(amount) || 0;

    const newMonthlyAmounts = propagateMonthlyLimits(
      cat.monthly_amounts || Array.from({ length: 12 }, () => 0),
      selectedMonth,
      numAmount,
      isMonthly
    );

    await onSave({
      name: cat.name.trim(),
      monthly_amounts: newMonthlyAmounts,
      is_monthly: isMonthly,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-w-0 flex-nowrap items-center gap-2">
      <div className="relative">
        <input
          ref={inputRef}
          type="number"
          step="1"
          min="0"
          placeholder="0"
          aria-label="Kwota"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input-field w-full py-1.5 pr-8 text-right text-sm"
          disabled={saving}
        />
        <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-text-muted">
          zł
        </span>
      </div>

      <button
        type="button"
        onClick={() => setIsMonthly((m) => !m)}
        className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors ${
          isMonthly
            ? "border-primary bg-secondary text-white"
            : "border-line bg-surface text-text-secondary hover:border-input"
        }`}
        title="Przełącz: miesięczny / roczny"
      >
        {isMonthly ? "mies." : "rok"}
      </button>
      <FormButtons onClickClose={onCancel} loading={saving} small />
    </form>
  );
}

function formatAmount(cat: BudgetCategory, selectedMonth: number): string {
  const limits = cat.monthly_amounts || Array.from({ length: 12 }, () => 0);

  if (!cat.is_monthly) {
    if (limits[0] === 0) return "-";
    return `${Math.round(limits[0]).toLocaleString("pl-PL")} zł`;
  }

  const val = limits[selectedMonth] || 0;
  if (val === 0) return "-";
  return `${Math.round(val).toLocaleString("pl-PL")} zł`;
}

function formatSuffix(cat: BudgetCategory): string {
  return cat.is_monthly ? "/ mies." : "/ rok";
}

export default function BudgetCategoriesEditor({
  year,
  selectedMonth,
  onCategoriesChange,
}: {
  readonly year: number;
  readonly selectedMonth: number;
  readonly onCategoriesChange?: () => void;
}) {
  const {
    categories,
    loading,
    maxReached,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    importFromYear,
  } = useBudgetCategories(year);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = async (name: string) => {
    await addCategory({
      name,
      monthly_amounts: Array.from({ length: 12 }, () => 0),
      is_monthly: false,
    });
    setShowAddForm(false);
    onCategoriesChange?.();
  };

  const handleSaveEdit = async (
    id: string,
    updates: Pick<BudgetCategory, "name" | "monthly_amounts" | "is_monthly">
  ) => {
    await updateCategory(id, updates);
    setEditingId(null);
    onCategoriesChange?.();
  };

  const handleDelete = async (id: string) => {
    await deleteCategory(id);
    onCategoriesChange?.();
  };

  const move = async (index: number, direction: -1 | 1) => {
    const next = [...categories];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    await reorderCategories(next);
    onCategoriesChange?.();
  };

  return (
    <div className="card mb-4 rounded-xl p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold text-text">
          Kategorie budżetu <span className="font-normal text-text-muted">{year}</span>
          {categories.length > 0 && (
            <span className="ml-2 text-xs font-normal text-text-muted tabular-nums">
              ({categories.length}/{MAX_CATEGORIES})
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void importFromYear(year - 1).then((n) => n > 0 && onCategoriesChange?.())}
            className="inline-flex min-h-11 items-center rounded-lg border border-line-strong px-3 text-sm font-medium text-text-secondary hover:text-text disabled:opacity-50"
          >
            Importuj z {year - 1}
          </button>
          {!maxReached && (
            <AddButton
              onClick={() => {
                setShowAddForm(true);
                setEditingId(null);
              }}
            />
          )}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="mb-4 space-y-2">
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
                editingId === cat.id ? "border-primary bg-card" : "border-line bg-surface hover:border-line-strong"
              }`}
            >
              {editingId === cat.id ? (
                <AmountEditor
                  cat={cat}
                  onSave={(u) => handleSaveEdit(cat.id, u)}
                  onCancel={() => setEditingId(null)}
                  saving={loading}
                  selectedMonth={selectedMonth}
                />
              ) : (
                <>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate text-sm font-medium text-text">{cat.name}</span>
                    {(!cat.monthly_amounts ||
                      (cat.is_monthly ? cat.monthly_amounts[selectedMonth] : cat.monthly_amounts[0]) === 0) && (
                      <span className="shrink-0 rounded-lg border border-warning-line bg-warning-soft px-1.5 py-0.5 text-xs font-bold text-warning">
                        brak limitu
                      </span>
                    )}
                  </div>

                  <span className="shrink-0 text-sm font-bold text-text tabular-nums">
                    {formatAmount(cat, selectedMonth)}{" "}
                    {cat.monthly_amounts &&
                      (cat.is_monthly ? cat.monthly_amounts[selectedMonth] : cat.monthly_amounts[0]) > 0 && (
                        <span className="text-xs font-normal text-text-muted">{formatSuffix(cat)}</span>
                      )}
                  </span>

                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0 || loading}
                      type="button"
                      className="p-0.5 text-text-muted transition-colors hover:text-text disabled:opacity-20"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => move(idx, 1)}
                      disabled={idx === categories.length - 1 || loading}
                      type="button"
                      className="p-0.5 text-text-muted transition-colors hover:text-text disabled:opacity-20"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>

                  <EditButton
                    onClick={() => {
                      setEditingId(cat.id);
                      setShowAddForm(false);
                    }}
                    small
                  />
                  <DeleteButton onClick={() => handleDelete(cat.id)} small />
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddForm && !maxReached && (
        <AddCategoryForm onAdd={handleAdd} saving={loading} onCancel={() => setShowAddForm(false)} />
      )}
    </div>
  );
}
