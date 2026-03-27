"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { format, startOfMonth, endOfMonth, isSameMonth, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { Check, Minus, Plus, ChevronDown, ChevronUp, RefreshCw, Loader2 } from "lucide-react";
import { Bill, BudgetCategory } from "../../types";
import { useBills } from "../../hooks/useBills";
import { useBudgetCategories } from "../../hooks/useBudgetCategories"; 
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";
import { DeleteButton, EditButton, ShareButton, FormButtons } from "../CommonButtons";
import NoResultsState from "../NoResultsState";

interface BillListProps {
  year: number;
  onBillsChange?: () => void;
}

interface MonthAccordionProps {
 monthData: any;
 onBillsChange?: () => void;
 year: number 
} 

function CategoryBadge({ category }: { readonly category?: BudgetCategory | null }) {
  if (!category) {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider text-textMuted bg-surface border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded">
        Inne
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-blue-50 dark:bg-blue-900/30 border border-primary px-1.5 py-0.5 rounded">
      {category.name}
    </span>
  );
}

function RecurringBadge() {
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 px-1.5 py-0.5 rounded">
      <RefreshCw className="w-2.5 h-2.5" /> Cykliczny
    </span>
  );
}

export default function BillListGrouped({ year, onBillsChange }: Readonly<BillListProps>) {
  const [activeMonths, setActiveMonths] = useState<{ id: number, date: Date, label: string, isCurrentMonth: boolean }[]>([]);
  const { fetchActiveMonths } = useBills(); 

  useEffect(() => {
    const loadMonths = async () => {
      const activeIndexes = await fetchActiveMonths(year);
      
      const generatedMonths = activeIndexes.map((monthIndex) => {
        const date = new Date(year, monthIndex, 1);
        return {
          id: monthIndex,
          date,
          label: format(date, "LLLL yyyy", { locale: pl }),
          isCurrentMonth: isSameMonth(date, new Date()),
        };
      });

      setActiveMonths(generatedMonths);
    };

    loadMonths();
  }, [year, fetchActiveMonths]);

  if (activeMonths.length === 0) {
    return <NoResultsState text="rachunków w wybranym roku" />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {activeMonths.map((m) => (
        <MonthAccordion
          key={m.id}
          monthData={m}
          onBillsChange={onBillsChange}
          year={year} 
        />
      ))}
    </div>
  );
}

function MonthAccordion({ monthData, onBillsChange, year }: Readonly<MonthAccordionProps>) {
  const [isOpen, setIsOpen] = useState(monthData.isCurrentMonth);

  return (
    <div className="card rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 bg-surface hover:bg-surfaceHover transition-colors"
      >
        <h4 className="text-sm font-bold text-textSecondary uppercase tracking-wider">
          {monthData.label}
        </h4>
        {isOpen ? <ChevronUp className="w-5 h-5 text-textMuted" /> : <ChevronDown className="w-5 h-5 text-textMuted" />}
      </button>
      
      {isOpen && (
        <div className="p-4">
          <MonthContent
            dateFrom={format(startOfMonth(monthData.date), "yyyy-MM-dd")}
            dateTo={format(endOfMonth(monthData.date), "yyyy-MM-dd")}
            onBillsChange={onBillsChange}
            year={year}
          />
        </div>
      )}
    </div>
  );
}

function MonthContent({ dateFrom, dateTo, onBillsChange, year }: { dateFrom: string, dateTo: string, onBillsChange?: () => void, year: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const limit = 20;

  const { incomeItems, expenseItems, fetching, hasMore, fetchBills, deleteBill, editBill, markAsDone } = useBills({
    dateFrom,
    dateTo,
    includeRecurringChildren: true,
  });

  const { categories, loading: categoriesLoading } = useBudgetCategories(year);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedBill, setEditedBill] = useState<Bill | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && amountRef.current) amountRef.current.focus();
  }, [editingId]);

  const handleRefresh = useCallback(() => {
    fetchBills(false, 1, page * limit);
    if (onBillsChange) onBillsChange();
  }, [fetchBills, page, onBillsChange]);

  const handleDelete = async (bill: Bill) => {
    let deleteFuture = false;
    if (bill.is_recurring) {
      const ok = await toast.confirm(`Usunąć tylko ten rachunek czy również przyszłe powtórzenia?\n\nKliknij "Usuń" aby usunąć tylko ten.`);
      if (!ok) return;
      deleteFuture = await toast.confirm("Usunąć również przyszłe kopie cykliczne?");
    } else {
      const ok = await toast.confirm("Czy na pewno chcesz usunąć ten wpis?");
      if (!ok) return;
    }

    await withRetry(() => deleteBill(bill.id, deleteFuture), toast, { context: "MonthContent.deleteBill", userId: user?.id });
    toast.success("Usunięto pomyślnie.");
    handleRefresh();
  };

  const handleSaveEdit = async () => {
    if (!editedBill) return;
    const finalBill = { ...editedBill, category_id: editedBill.category_id || null };
    
    await withRetry(() => editBill(finalBill), toast, { context: "MonthContent.editBill", userId: user?.id });
    toast.success("Zmieniono pomyślnie.");
    setEditingId(null);
    setEditedBill(null);
    handleRefresh();
  };

  const handleMarkDone = async (bill: Bill) => {
    await withRetry(() => markAsDone(bill.id), toast, { context: "MonthContent.markAsDone", userId: user?.id });
    toast.success("Opłacono.");
    handleRefresh();
  };
  
  const handleShare = (bill: Bill) => {
    let text = `Hej, oddaj mi proszę ${bill.amount.toFixed(2)} zł`;
    if (bill.description) {
      text += ` za ${bill.description}`;
    }
    text += ".";
    const shareData = { title: "Rachunek", text };
    if (navigator.share) {
      navigator.share(shareData).catch(console.error);
    } else {
      toast.error("Udostępnianie nie jest wspierane w tej przeglądarce.");
    }
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchBills(true, next, limit); 
  };

  if (expenseItems.length === 0 && incomeItems.length === 0) {
    return <NoResultsState text="wpisów w tym miesiącu" />;
  }

  const renderBill = (b: Bill) => {
    const isEditing = editingId === b.id;

    if (isEditing && editedBill) {
      return (
        <li key={b.id} className="card rounded-xl border border-primary p-4 transition-colors">
          <div className="space-y-3">
            <div>
              <label className="form-label" htmlFor="amount">Kwota:</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditedBill({ ...editedBill, is_income: !editedBill.is_income })}
                  className={`p-2 rounded-lg transition-colors ${
                    editedBill.is_income
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
                  }`}
                  title={editedBill.is_income ? "Przychód" : "Wydatek"}
                >
                  {editedBill.is_income ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                </button>
                <input
                  id="amount"
                  ref={amountRef}
                  type="number"
                  step="0.01"
                  placeholder="Kwota"
                  value={editedBill.amount}
                  onChange={(e) => setEditedBill({ ...editedBill, amount: Number.parseFloat(e.target.value) || 0 })}
                  className="input-field flex-1"
                  required
                />
              </div>
            </div>
            <div>
              <label className="form-label" htmlFor={`category-${b.id}`}>Kategoria:</label>
              <select
                id={`category-${b.id}`}
                value={editedBill.category_id || ""}
                onChange={(e) => setEditedBill({ ...editedBill, category_id: e.target.value })}
                className="input-field"
                disabled={categoriesLoading}
              >
                <option value="">Inne (bez kategorii)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="desc" className="form-label">Opis:</label>
              <textarea
                value={editedBill.description || ""}
                onChange={(e) => setEditedBill({ ...editedBill, description: e.target.value })}
                className="input-field"
                rows={2}
                id="desc"
              />
            </div>
            <div>
              <label htmlFor="data" className="form-label">Data:</label>
              <input
                type="date"
                value={editedBill.date}
                onChange={(e) => setEditedBill({ ...editedBill, date: e.target.value })}
                className="input-field w-full min-w-0 px-1 text-xs"
                id="data"
              />
            </div>
            <FormButtons onClickSave={handleSaveEdit} onClickClose={() => setEditingId(null)} loading={fetching}/>
          </div>
        </li>
      );
    }

    return (
      <li key={b.id} className="card p-4 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3 transition">
        <div className="flex flex-col flex-1 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-bold text-lg tabular-nums ${b.is_income ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
              {b.is_income ? "+" : "-"}{b.amount.toFixed(2)} zł
            </span>
            <CategoryBadge category={b.category} />
            {b.is_recurring && <RecurringBadge />}
          </div>
          {b.description && (
            <span className="text-textSecondary text-sm">{b.description}</span>
          )}
          <span className="text-xs text-textSubtle font-medium">
            {format(parseISO(b.date), "dd.MM.yyyy")}
          </span>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t border-gray-100 dark:border-gray-800 sm:border-0">
          {!b.done && !b.is_income && (
            <button
              onClick={() => handleMarkDone(b)}
              title="Oznacz jako zapłacone"
              className="flex-1 flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors border border-green-200 dark:border-green-500/30"
            >
              <Check className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide">Opłać</span>
            </button>
          )}
          <ShareButton onClick={() => handleShare(b)} />
          <EditButton onClick={() => { setEditingId(b.id); setEditedBill(b); }} />
          <DeleteButton onClick={() => handleDelete(b)} />
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-6">
      {incomeItems.length > 0 && (
        <div>
          <h5 className="text-xs font-bold text-green-600 dark:text-green-500 uppercase tracking-wider mb-3 px-1 border-b border-green-100 dark:border-green-900/30 pb-2">
            Wpływy
          </h5>
          <ul className="space-y-3">
            {incomeItems.map(renderBill)}
          </ul>
        </div>
      )}
      {expenseItems.length > 0 && (
        <div>
          <h5 className="text-xs font-bold text-red-600 dark:text-red-500 uppercase tracking-wider p-2 ">
            Wydatki
          </h5>
          <ul className="space-y-3">
            {expenseItems.map(renderBill)}
          </ul>
        </div>
      )}

      {hasMore && (
        <button 
          onClick={handleLoadMore} 
          disabled={fetching} 
          className="w-full py-3 bg-surface hover:bg-surfaceHover text-textMuted hover:text-text border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-sm mt-4"
        >
          {fetching ? <Loader2 className="w-5 h-5 animate-spin" /> : "Więcej..."}
        </button>
      )}
    </div>
  );
}