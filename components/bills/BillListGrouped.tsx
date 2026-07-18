"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { format, startOfMonth, endOfMonth, isSameMonth, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { Check, Minus, Plus, ChevronDown, ChevronUp, RefreshCw, Loader2 } from "lucide-react";
import type { Bill, BudgetCategory } from "@/types/bills";
import { useBills } from "@/hooks/db/useBills";
import { useBudgetCategories } from "@/hooks/db/useBudgetCategories"; 
import { useSettings } from "@/hooks/db/useSettings";
import { DeleteButton, EditButton, ShareButton, FormButtons } from "../ui/CommonButtons";
import NoResultsState from "../ui/NoResultsState";
import { isValidAmountInput, parseAmountInput } from "@/lib/amountUtils";

interface BillListProps {
  year: number;
  onBillsChange?: () => void;
}

interface FetchOptions {
  dateFrom?: string;
  dateTo?: string;
  includeRecurringChildren?: boolean;
  categoryId?: string;
}

interface MonthData {
  id: number;
  date: Date;
  label: string;
  isCurrentMonth: boolean;
}

interface AccordionShellProps {
  label: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

interface BillGroupContentProps {
  fetchOptions: FetchOptions;
  onBillsChange?: () => void;
  year: number;
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

// Wspólna "skorupa" akordeonu, współdzielona przez widok wg miesięcy i wg kategorii -
// różni je tylko etykieta nagłówka i domyślny stan (miesiąc bieżący jest domyślnie otwarty).
function AccordionShell({ label, defaultOpen = false, children }: Readonly<AccordionShellProps>) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="card rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 bg-surface hover:bg-surfaceHover transition-colors"
      >
        <h4 className="text-sm font-bold text-textSecondary uppercase tracking-wider">
          {label}
        </h4>
        {isOpen ? <ChevronUp className="w-5 h-5 text-textMuted" /> : <ChevronDown className="w-5 h-5 text-textMuted" />}
      </button>

      {isOpen && <div className="p-4">{children}</div>}
    </div>
  );
}

export default function BillListGrouped({ year, onBillsChange }: Readonly<BillListProps>) {
  const { settings } = useSettings();
  const sortMode = settings.sort_bills === "category" ? "category" : "month";

  const [activeMonths, setActiveMonths] = useState<MonthData[]>([]);
  const [activeCategories, setActiveCategories] = useState<{ id: string, name: string }[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  const { fetchActiveMonths, fetchActiveCategories } = useBills(); 
  const { categories, loading: categoriesLoading } = useBudgetCategories(year);

  useEffect(() => {
    const loadMonths = async () => {
      setGroupsLoading(true);
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
      setGroupsLoading(false);
    };

    if (sortMode === "month") loadMonths();
  }, [year, sortMode, fetchActiveMonths]);

  useEffect(() => {
    const loadCategories = async () => {
      setGroupsLoading(true);
      const activeIds = await fetchActiveCategories(year);

      const generatedCategories = activeIds
        .map((id) => {
          if (id === "none") return { id: "none", name: "Inne" };
          const cat = categories.find((c) => c.id === id);
          return cat ? { id: cat.id, name: cat.name } : null;
        })
        .filter((c): c is { id: string; name: string } => c !== null)
        .sort((a, b) => {
          if (a.id === "none") return 1;
          if (b.id === "none") return -1;
          return a.name.localeCompare(b.name, "pl");
        });

      setActiveCategories(generatedCategories);
      setGroupsLoading(false);
    };

    if (sortMode === "category" && !categoriesLoading) loadCategories();
  }, [year, sortMode, categoriesLoading, categories, fetchActiveCategories]);

  if (groupsLoading || categoriesLoading) return null;

  if (sortMode === "category") {
    if (activeCategories.length === 0) {
      return <NoResultsState text="rachunków w wybranym roku" />;
    }

    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {activeCategories.map((cat) => (
          <AccordionShell key={cat.id} label={cat.name}>
            <BillGroupContent
              fetchOptions={{
                dateFrom: yearStart,
                dateTo: yearEnd,
                includeRecurringChildren: true,
                categoryId: cat.id,
              }}
              onBillsChange={onBillsChange}
              year={year}
            />
          </AccordionShell>
        ))}
      </div>
    );
  }

  if (activeMonths.length === 0) {
    return <NoResultsState text="rachunków w wybranym roku" />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {activeMonths.map((m) => (
        <AccordionShell key={m.id} label={m.label} defaultOpen={m.isCurrentMonth}>
          <BillGroupContent
            fetchOptions={{
              dateFrom: format(startOfMonth(m.date), "yyyy-MM-dd"),
              dateTo: format(endOfMonth(m.date), "yyyy-MM-dd"),
              includeRecurringChildren: true,
            }}
            onBillsChange={onBillsChange}
            year={year}
          />
        </AccordionShell>
      ))}
    </div>
  );
}

// Treść jednego akordeonu (lista rachunków + akcje) - używana zarówno przez widok
// miesięczny, jak i kategoriowy; różni je tylko przekazany fetchOptions.
function BillGroupContent({ fetchOptions, onBillsChange, year }: Readonly<BillGroupContentProps>) {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { loading, fetching, incomeItems, expenseItems, hasMore, fetchBills, deleteBill, editBill, markAsDone } = useBills(fetchOptions);

  const { categories, loading: categoriesLoading } = useBudgetCategories(year);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedBill, setEditedBill] = useState<Bill | null>(null);
  const [amountText, setAmountText] = useState<string>("");
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && amountRef.current) amountRef.current.focus();
  }, [editingId]);

  // Kwota jest trzymana jako osobny string podczas edycji, żeby nie zamieniać
  // jej na liczbę przy każdym naciśnięciu klawisza - to właśnie uniemożliwiało
  // wpisanie przecinka/kropki (przeglądarka natychmiast "ucinała" znak, którego
  // parseFloat jeszcze nie umiał doliczyć do wartości) i pokazywało samotne "0"
  // zaraz po wyczyszczeniu pola.
  const handleAmountChange = (raw: string) => {
    if (!isValidAmountInput(raw)) return;
    setAmountText(raw);
    if (!editedBill) return;
    setEditedBill({ ...editedBill, amount: parseAmountInput(raw) });
  };

  const startEditing = (bill: Bill) => {
    setEditingId(bill.id);
    setEditedBill(bill);
    setAmountText(String(bill.amount).replace('.', ','));
  };

  const handleRefresh = useCallback(() => {
    fetchBills(false, 1, page * limit);
    if (onBillsChange) onBillsChange();
  }, [fetchBills, page, onBillsChange]);

  const handleDelete = async (bill: Bill) => {

    await deleteBill(bill.id);
    handleRefresh();
  };

  const handleSaveEdit = async () => {
    if (!editedBill) return;
    const finalBill = { ...editedBill, category_id: editedBill.category_id || null };
    
    await editBill(finalBill);
    setEditingId(null);
    setEditedBill(null);
    handleRefresh();
  };

  const handleMarkDone = async (bill: Bill) => {
    await markAsDone(bill.id);
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
    } 
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchBills(true, next, limit); 
  };

  if (expenseItems.length === 0 && incomeItems.length === 0) {
    return <NoResultsState text="wpisów w tej grupie" />;
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
                  type="text"
                  inputMode="decimal"
                  placeholder="Kwota"
                  value={amountText}
                  onChange={(e) => handleAmountChange(e.target.value)}
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
            <FormButtons onClickSave={handleSaveEdit} onClickClose={() => setEditingId(null)} loading={loading}/>
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
          <EditButton onClick={() => startEditing(b)} />
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
