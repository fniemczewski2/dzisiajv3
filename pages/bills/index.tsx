// pages/bills/index.tsx

import React, { useState, useMemo, useEffect } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { Calculator, ChartColumnBig, Check, RefreshCw } from "lucide-react";
import { useBills } from "../../hooks/useBills";
import { useBudgetCategories } from "../../hooks/useBudgetCategories";
import { useRouter } from "next/router";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";
import { format, parseISO, getYear } from "date-fns";
import { pl } from "date-fns/locale";
import DailySpendingForm from "../../components/widgets/DailySpendingForm";
import BillForm from "../../components/bills/BillForm";
import { AddButton, EditButton, DeleteButton, ShareButton } from "../../components/CommonButtons";
import { useQuickAction } from "../../hooks/useQuickAction";
import NoResultsState from "../../components/NoResultsState";
import type { Bill, BudgetCategory } from "../../types";
import BankCsvImporter from "../../components/budget/BankCSV";
import BillListGrouped from "../../components/bills/BillListGrouped";

const currentYear = getYear(new Date());

function groupByMonth(bills: Bill[]): Record<string, Bill[]> {
  return bills.reduce<Record<string, Bill[]>>((acc, bill) => {
    const month = format(parseISO(bill.date), "LLLL yyyy", { locale: pl });
    if (!acc[month]) acc[month] = [];
    acc[month].push(bill);
    return acc;
  }, {});
}

function CategoryBadge({ category }: { category?: BudgetCategory | null }) {
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

export default function BillsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all"); // category id or "all"/"none"

  const { categories, loading: catsLoading } = useBudgetCategories(currentYear);
  const { incomeItems, expenseItems, fetching, fetchBills, markAsDone, deleteBill } = useBills({
    includeRecurringChildren: true,
  });

  useQuickAction({ onActionAdd: () => setShowForm(true) });

  const filteredExpenses = useMemo(() => {
    if (filterCategory === "all")  return expenseItems;
    if (filterCategory === "none") return expenseItems.filter((b) => !b.category_id);
    return expenseItems.filter((b) => b.category_id === filterCategory);
  }, [expenseItems, filterCategory]);

  const grouped = useMemo(() => groupByMonth(filteredExpenses), [filteredExpenses]);

  const handleDelete = async (bill: Bill) => {
    let deleteFuture = false;
    if (bill.is_recurring) {
      const ok = await toast.confirm(
        `Usunąć tylko ten rachunek czy również przyszłe powtórzenia?\n\nKliknij "Usuń" aby usunąć tylko ten.`
      );
      if (!ok) return;
      const okFuture = await toast.confirm("Usunąć również przyszłe kopie cykliczne?");
      deleteFuture = okFuture;
    } else {
      const ok = await toast.confirm("Czy na pewno chcesz usunąć ten wpis?");
      if (!ok) return;
    }

    await withRetry(
      () => deleteBill(bill.id, deleteFuture),
      toast,
      { context: "BillsPage.deleteBill", userId: user?.id }
    );
    toast.success("Usunięto pomyślnie.");
    fetchBills();
  };

  const handleMarkDone = async (bill: Bill) => {
    await withRetry(
      () => markAsDone(bill.id),
      toast,
      { context: "BillsPage.markAsDone", userId: user?.id }
    );
    toast.success("Oznaczono jako opłacone.");
    fetchBills();
  };

  const handleShare = (bill: Bill) => {
    const text = `Hej, oddaj mi proszę ${bill.amount.toFixed(2)} zł${
      bill.description ? ` za ${bill.description}` : ""
    }.`;
    if (navigator.share) {
      navigator.share({ title: "Rachunek", text }).catch(console.error);
    } else {
      toast.error("Udostępnianie nie jest wspierane w tej przeglądarce.");
    }
  };

  const isLoading = fetching || catsLoading;

  useEffect(() => {
    let toastId: string | undefined;
    
    if (isLoading && toast.loading) {
      toastId = toast.loading("Ładowanie rachunków...");
    }

    return () => {
      if (toastId && toast.dismiss) {
        toast.dismiss(toastId);
      }
    };
  }, [isLoading, toast]);

  return (
    <>
      <Head>
        <title>Finanse – Dzisiaj</title>
      </Head>
      <Layout>
        <div className="flex justify-between items-center mb-6 gap-2">
          <div className="flex flex-row items-center gap-2 sm:gap-4">
            <h2 className="text-2xl font-bold text-text">Finanse</h2>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => router.push("/bills/budget")}
                title="Budżet"
                className="p-2 sm:p-2.5 bg-surface border border-gray-200 dark:border-gray-800 rounded-xl text-textSecondary hover:text-text hover:bg-surfaceHover transition-colors shadow-sm"
              >
                <ChartColumnBig className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={() => router.push("/bills/calculator")}
                title="Kalkulator Podziału"
                className="p-2 sm:p-2.5 bg-surface border border-gray-200 dark:border-gray-800 rounded-xl text-textSecondary hover:text-text hover:bg-surfaceHover transition-colors shadow-sm"
              >
                <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
          <AddButton onClick={() => setShowForm(true)} type="button" />
        </div>

        {showForm && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-4">
            <BillForm
              categories={categories}
              onChange={() => { fetchBills(); setShowForm(false); }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {editingBill && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-4">
            <BillForm
              categories={categories}
              initial={editingBill}
              onChange={() => { fetchBills(); setEditingBill(null); }}
              onCancel={() => setEditingBill(null)}
            />
          </div>
        )}

        <DailySpendingForm />
        <BankCsvImporter year={currentYear} />

        <BillListGrouped year={currentYear} categoryId={filterCategory}/>
      </Layout>
    </>
  );
}
