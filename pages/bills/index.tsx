// pages/bills/index.tsx
//
// Finanse: rachunki stałe (tabela 1) i miesięczne wydatki/wpływy (tabela 2),
// z wyborem profilu i miesiąca.

import React, { useCallback, useMemo, useState } from "react";
import { addMonths, format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Seo from "@/components/ui/SEO";
import { SkeletonList } from "@/components/ui/Skeleton";
import ProfileSwitcher from "@/components/finance/ProfileSwitcher";
import RecurringBillsSection from "@/components/finance/RecurringBillsSection";
import TransactionsSection from "@/components/finance/TransactionsSection";
import { useBudgetCategories } from "@/hooks/db/useBudgetCategories";
import { useCategoryNameMap, useFinanceProfiles, useRecurringBills, useTransactions } from "@/hooks/db/useFinance";
import { useQuickAction } from "@/hooks/useQuickAction";
import { getAppDate } from "@/lib/dateUtils";
import { monthRange, nextMonthKey } from "@/lib/finance";
import type { NewTransaction } from "@/types/finance";

const monthLabel = (key: string) => format(parseISO(`${key}-01`), "LLLL yyyy", { locale: pl });

export default function FinancePage() {
  const [monthKey, setMonthKey] = useState(getAppDate().slice(0, 7));
  const [profileId, setProfileId] = useState<string | null>(null);
  const year = Number(monthKey.slice(0, 4));
  const { from, to } = monthRange(monthKey);

  const { categories, loading: catsLoading } = useBudgetCategories(year);
  const { categories: previousYearCategories } = useBudgetCategories(year - 1);
  const categoryNames = useCategoryNameMap(categories, previousYearCategories);
  const { profiles } = useFinanceProfiles();
  const { bills, loading: billsLoading, saveBill, removeBill } = useRecurringBills();
  const tx = useTransactions({ from, to });

  const [quickAdd, setQuickAdd] = useState(0);
  useQuickAction({ onActionAdd: () => setQuickAdd((n) => n + 1) });

  // Filtr profilu: „Wszystkie” pokazuje wszystko, profil – tylko swoje pozycje.
  const inProfile = useCallback(
    <T extends { profile_id: string | null }>(x: T) => !profileId || x.profile_id === profileId,
    [profileId]
  );
  const visibleBills = useMemo(() => bills.filter(inProfile), [bills, inProfile]);
  const visibleTx = useMemo(() => tx.transactions.filter(inProfile), [tx.transactions, inProfile]);

  const addWithSuggestions = async (t: NewTransaction) => {
    const history = await tx.loadHistory();
    return tx.addTransaction(tx.withSuggestions(t, bills, history, categories, categoryNames));
  };

  const shiftMonth = (delta: number) => setMonthKey((k) => format(addMonths(parseISO(`${k}-01`), delta), "yyyy-MM"));
  const loading = catsLoading || billsLoading || tx.loading;

  return (
    <>
      <Seo
        title="Finanse"
        description="Rachunki stałe z terminami i przypomnieniami oraz miesięczne podsumowanie wydatków i wpływów."
        canonical="https://dzisiaj.fun/bills"
        keywords="rachunki, wydatki, budżet domowy, finanse osobiste"
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="page-title">Finanse</h1>
        </div>
      </div>
      <div className="card mx-auto mb-4 flex w-fit items-center rounded-card p-1 shadow-sm">
        <button
          onClick={() => shiftMonth(-1)}
          className="rounded-xl bg-transparent p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text sm:p-2.5"
          type="button"
          title="Poprzedni miesiąc"
          aria-label="Poprzedni miesiąc"
        >
          <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        <h2 className="mx-4 min-w-35 text-center text-lg font-bold tracking-wide text-text capitalize sm:mx-8 sm:min-w-40 sm:text-xl">
          {monthLabel(monthKey)}
        </h2>

        <button
          onClick={() => shiftMonth(1)}
          className="rounded-xl bg-transparent p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text sm:p-2.5"
          type="button"
          title="Następny miesiąc"
          aria-label="Następny miesiąc"
        >
          <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>

      <ProfileSwitcher profiles={profiles} value={profileId} onChange={setProfileId} />

      {loading ? (
        <SkeletonList count={6} variant="row" />
      ) : (
        <div className="space-y-6">
          <RecurringBillsSection
            bills={visibleBills}
            monthKey={monthKey}
            monthLabel={monthLabel(monthKey)}
            nextMonthLabel={monthLabel(nextMonthKey(monthKey))}
            transactions={visibleTx}
            categories={categories}
            profiles={profiles}
            profileId={profileId}
            onSave={saveBill}
            onRemove={(id) => void removeBill(id)}
          />
          <TransactionsSection
            addSignal={quickAdd}
            monthLabel={monthLabel(monthKey)}
            monthFrom={from}
            transactions={visibleTx}
            categories={categories}
            categoryNames={categoryNames}
            bills={bills}
            profiles={profiles}
            profileId={profileId}
            onAdd={addWithSuggestions}
            onUpdate={(id, patch) => void tx.updateTransaction(id, patch)}
            onLink={(id, billId) => void tx.linkToBill(id, billId)}
            onRemove={(id) => void tx.removeTransaction(id)}
            csv={{
              loadHistory: tx.loadHistory,
              withSuggestions: tx.withSuggestions,
              importTransactions: tx.importTransactions,
            }}
          />
        </div>
      )}
    </>
  );
}
