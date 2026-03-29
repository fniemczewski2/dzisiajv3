"use client";
// components/bills/BudgetCategoriesEditor.tsx

import React, { useState, useRef, useEffect } from "react";
import { ChevronUp, ChevronDown, PlusCircle } from "lucide-react";
import { useBudgetCategories } from "../../hooks/useBudgetCategories";
import { useToast } from "../../providers/ToastProvider";
import {
  EditButton,
  DeleteButton,
  FormButtons,
} from "../CommonButtons";
import type { BudgetCategory } from "../../types";

interface AmountEditorProps {
  cat: BudgetCategory;
  onSave: (updates: Pick<BudgetCategory, "name" | "amount" | "is_monthly">) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

interface AddCategoryFormProps {
  onAdd: (name: string) => Promise<void>;
  saving: boolean;
  onCancel: () => void;
}

type ViewMode = "year" | "month";

function ViewToggle({ view, onChange }: { readonly view: ViewMode; readonly onChange: (v: ViewMode) => void }) {
  return (
    <div className="flex gap-1 bg-surface rounded-xl p-1 border border-gray-200 dark:border-gray-700">
      {(["year", "month"] as ViewMode[]).map((v) => {
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
              view === v
                ? "bg-secondary text-white shadow-sm"
                : "text-textMuted hover:text-text"
            }`}
          >
            {v === "year" ? "Rok" : "Miesiąc"}
          </button>
        );
      })}
    </div>
  );
}

function AddCategoryForm({
  onAdd,
  saving,
  onCancel,
}: Readonly<AddCategoryFormProps>) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onAdd(name.trim());
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2"
    >
      <input
        ref={inputRef}
        type="text"
        placeholder="Nazwa kategorii…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="input-field flex-1 py-2"
        disabled={saving}
      />
      <FormButtons loading={saving} disabled={!name.trim()} onClickClose={onCancel} />
    </form>
  );
}

function AmountEditor({
  cat,
  onSave,
  onCancel,
  saving,
}: Readonly<AmountEditorProps>) {
  const [amount,    setAmount]    = useState(cat.amount > 0 ? String(cat.amount) : "");
  const [isMonthly, setIsMonthly] = useState(cat.is_monthly);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      name:       cat.name.trim(),
      amount:     Number.parseFloat(amount) || 0,
      is_monthly: isMonthly,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-nowrap items-center gap-2 min-w-0"
    >

      <div className="">
        <input
          ref={inputRef}
          type="number"
          step="1"
          min="0"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input-field w-full py-1.5 text-sm text-right pr-8"
          disabled={saving}
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-textMuted pointer-events-none">
          zł
        </span>
      </div>

      <button
        type="button"
        onClick={() => setIsMonthly((m) => !m)}
        className={`shrink-0 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${
          isMonthly
            ? "bg-secondary text-white border-primary"
            : "bg-surface text-textSecondary border-gray-200 dark:border-gray-700 hover:border-gray-400"
        }`}
        title="Przełącz: miesięczny / roczny"
      >
        {isMonthly ? "mies." : "rok"}
      </button>
      <FormButtons onClickClose={onCancel} loading={saving} small/>
    </form>
  );
}

function formatAmount(cat: BudgetCategory, view: ViewMode): string {
  if (cat.amount === 0) return "—";
  const getBaseValue = () => {
    if (cat.is_monthly && view === "year") return cat.amount * 12;
    if (!cat.is_monthly && view === "month") return cat.amount / 12;
    return cat.amount;
  };

  const val = getBaseValue();
  return `${Math.round(val).toLocaleString("pl-PL")} zł`;
}

function formatSuffix(cat: BudgetCategory, view: ViewMode): string {
  if (cat.is_monthly) return view === "month" ? "/ mies." : "/ rok (×12)";
  return view === "month" ? "/ mies. (÷12)" : "/ rok";
}

export default function BudgetCategoriesEditor({
  year,
  onCategoriesChange,
}: {
  readonly year: number;
  readonly onCategoriesChange?: () => void;
}) {
  const { toast } = useToast();
  const {
    categories, loading, maxReached,
    addCategory, updateCategory, deleteCategory,
    reorderCategories
  } = useBudgetCategories(year);

  const [view,        setView]        = useState<ViewMode>("year");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId,   setEditingId]   = useState<string | null>(null);

  const handleAdd = async (name: string) => {
    try {
      await addCategory({ name, amount: 0, is_monthly: false });
      toast.success(`Dodano "${name}". Kliknij Edytuj, by ustawić limit.`);
      setShowAddForm(false);
      onCategoriesChange?.();
    } catch {
      toast.error("Wystąpił błąd dodawania.");
    }
  };

  const handleSaveEdit = async (
    id: string,
    updates: Pick<BudgetCategory, "name" | "amount" | "is_monthly">
  ) => {
    try {
      await updateCategory(id, updates);
      toast.success("Zmieniono pomyślnie.");
      setEditingId(null);
      onCategoriesChange?.();
    } catch {
      toast.error("Błąd zapisu.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await toast.confirm(
      `Usunąć kategorię "${name}"? Rachunki z tą kategorią staną się nieprzypisane.`
    );
    if (!ok) return;
    try {
      await deleteCategory(id);
      toast.success("Usunięto.");
      onCategoriesChange?.();
    } catch {
      toast.error("Błąd usuwania.");
    }
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
    <div className="card rounded-xl shadow-sm p-4 sm:p-6 mb-4">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h3 className="font-bold text-text">
          Kategorie budżetu{" "}
          <span className="text-textMuted font-normal">{year}</span>
          {categories.length > 0 && (
            <span className="ml-2 text-xs text-textMuted font-normal tabular-nums">
              ({categories.length}/10)
            </span>
          )}
        </h3>
        {categories.length > 0 && (
          <ViewToggle view={view} onChange={setView} />
        )}
      </div>

      {categories.length > 0 && (
        <div className="space-y-2 mb-4">
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors ${
                editingId === cat.id
                  ? "border-primary bg-card"
                  : "border-gray-200 dark:border-gray-700 bg-surface hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              {editingId === cat.id ? (
                <AmountEditor
                  cat={cat}
                  onSave={(u) => handleSaveEdit(cat.id, u)}
                  onCancel={() => setEditingId(null)}
                  saving={loading}
                />
              ) : (
                <>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="font-medium text-sm text-text truncate">
                      {cat.name}
                    </span>
                    {cat.amount === 0 && (
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 px-1.5 py-0.5 rounded">
                        brak limitu
                      </span>
                    )}
                  </div>

                  <span className="text-sm font-bold tabular-nums text-text shrink-0">
                    {formatAmount(cat, view)}{" "}
                    {cat.amount > 0 && (
                      <span className="text-xs font-normal text-textMuted">
                        {formatSuffix(cat, view)}
                      </span>
                    )}
                  </span>

                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0 || loading}
                      className="p-0.5 text-textMuted hover:text-text disabled:opacity-20 transition-colors"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => move(idx, 1)}
                      disabled={idx === categories.length - 1 || loading}
                      className="p-0.5 text-textMuted hover:text-text disabled:opacity-20 transition-colors"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  <EditButton onClick={() => {setEditingId(cat.id); setShowAddForm(false);}} small />
                  <DeleteButton onClick={() => handleDelete(cat.id, cat.name)} small />
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddForm && !maxReached && (
        <AddCategoryForm
          onAdd={handleAdd}
          saving={loading}
          onCancel={() => setShowAddForm(false)}
        />
      )}


      {!showAddForm && (
        <div
          className={`flex gap-2 flex-wrap ${
            categories.length > 0
              ? "border-t border-gray-100 dark:border-gray-800 pt-4"
              : ""
          }`}
        >
          {maxReached ? (
            <p className="text-sm text-textMuted">Osiągnięto limit 10 kategorii.</p>
          ) : (

            <button
              type="button"
              onClick={() => {
                setShowAddForm(true);
                setEditingId(null);
              }}
              className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-secondary transition-colors"
            >
              <PlusCircle className="w-4 h-4" /> Dodaj kategorię
            </button>
          )}
        </div>
      )}
    </div>
  );
}