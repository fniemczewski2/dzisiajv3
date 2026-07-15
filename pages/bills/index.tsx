// pages/bills/index.tsx

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Calculator, ChartColumnBig } from "lucide-react";
import { useBills } from "@/hooks/db/useBills";
import { useBudgetCategories } from "@/hooks/db/useBudgetCategories";
import { useRouter } from "next/router";
import { getYear } from "date-fns";
import DailySpendingForm from "@/components/widgets/DailySpendingForm";
import { AddButton } from "@/components/ui/CommonButtons";
import { useQuickAction } from "@/hooks/useQuickAction";
import type { Bill } from "@/types/bills";
import BillListGrouped from "@/components/bills/BillListGrouped";
import { SkeletonList } from "@/components/ui/Skeleton";
import Seo from "@/components/ui/SEO";

const BillForm = dynamic(() => import("@/components/bills/BillForm"), {
  ssr: false,
});
const BankCsvImporter = dynamic(() => import("@/components/budget/BankCSV"), {
  ssr: false, 
});

const currentYear = getYear(new Date());

export default function BillsPage() {
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  const { categories, loading: catsLoading } = useBudgetCategories(currentYear);
  const { fetching, fetchBills } = useBills({
    includeRecurringChildren: true,
  });

  useQuickAction({ onActionAdd: () => setShowForm(true) });

  const isLoading = fetching || catsLoading;

  return (
    <>
      <Seo
        title="Rachunki | Dzisiaj.Fun"
        description="Miej pełną kontrolę nad stałymi opłatami, śledź terminy płatności i unikaj opóźnień."
        canonical="https://dzisiaj.fun/bills"
        keywords="rachunki, płatności, opłaty stałe, finanse osobiste, przypomnienia finansowe"
      />
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
          <AddButton onClick={() => setShowForm(true)}/>
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

        {isLoading
          ? <SkeletonList count={6} variant="row" />
          : <BillListGrouped year={currentYear} />
        }
    </>
  );
}
