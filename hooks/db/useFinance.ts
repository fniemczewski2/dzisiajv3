// hooks/db/useFinance.ts
//
// Dane Finansów: profile, rachunki stałe i transakcje. Zmiany zapisują się
// od razu (optymistycznie), a błędy cofają stan i pokazują komunikat.

import { FINANCE_HISTORY_MONTHS } from "@/config/limits";
import { useCallback, useEffect, useMemo, useState } from "react";
import { addMonths, format, parseISO } from "date-fns";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { getAppDate } from "@/lib/dateUtils";
import { billOccurrences, importKey, suggestBillLink, suggestCategoryName } from "@/lib/finance";
import type { BudgetCategory } from "@/types/bills";
import {
  MAX_FINANCE_PROFILES,
  type FinanceProfile,
  type NewTransaction,
  type RecurringBill,
  type Transaction,
} from "@/types/finance";

export { BILL_TASK_CATEGORY } from "@/shared/bills";
import { BILL_TASK_CATEGORY, billTaskTitle } from "@/shared/bills";

// --- Profile ----------------------------------------------------------------------

export function useFinanceProfiles() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<FinanceProfile[]>([]);

  const fetchProfiles = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("finance_profiles")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });
    if (!error) setProfiles((data ?? []) as FinanceProfile[]);
  }, [supabase, userId]);

  useEffect(() => {
    void fetchProfiles();
  }, [fetchProfiles]);

  const addProfile = useCallback(
    async (name: string, color: string | null = null) => {
      if (!userId || profiles.length >= MAX_FINANCE_PROFILES) return;
      const { data, error } = await supabase
        .from("finance_profiles")
        .insert({ user_id: userId, name: name.trim().slice(0, 40), color, sort_order: profiles.length })
        .select()
        .single();
      if (error) {
        toast.error(error.code === "23514" ? error.message : "Nie udało się dodać profilu.");
        return;
      }
      setProfiles((p) => [...p, data as FinanceProfile]);
    },
    [supabase, userId, profiles.length, toast]
  );

  const updateProfile = useCallback(
    async (id: string, patch: Partial<Pick<FinanceProfile, "name" | "color">>) => {
      const previous = profiles;
      setProfiles((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      const { error } = await supabase.from("finance_profiles").update(patch).eq("id", id);
      if (error) {
        setProfiles(previous);
        toast.error("Nie udało się zapisać profilu.");
      }
    },
    [supabase, profiles, toast]
  );

  const removeProfile = useCallback(
    async (id: string) => {
      const ok = await toast.confirm("Usunąć profil? Rachunki i transakcje zostaną, ale bez przypisanego profilu.");
      if (!ok) return;
      const previous = profiles;
      setProfiles((p) => p.filter((x) => x.id !== id));
      const { error } = await supabase.from("finance_profiles").delete().eq("id", id);
      if (error) {
        setProfiles(previous);
        toast.error("Nie udało się usunąć profilu.");
      }
    },
    [supabase, profiles, toast]
  );

  return {
    profiles,
    addProfile,
    updateProfile,
    removeProfile,
    fetchProfiles,
    maxReached: profiles.length >= MAX_FINANCE_PROFILES,
  };
}

// --- Rachunki stałe -----------------------------------------------------------------

export function useRecurringBills() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBills = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("recurring_bills")
      .select("*")
      .eq("user_id", userId)
      .order("name", { ascending: true });
    setLoading(false);
    if (!error) setBills(((data ?? []) as RecurringBill[]).map((b) => ({ ...b, amount: Number(b.amount) })));
  }, [supabase, userId]);

  useEffect(() => {
    void fetchBills();
  }, [fetchBills]);

  /**
   * Zadanie „Zapłać: …” na dziś, jeśli termin wypada dziś. Zwykle tworzy je
   * nocny process-reminders; tu domykamy przypadek rachunku dodanego w ciągu dnia.
   * Unikalny indeks (rachunek, termin) chroni przed duplikatem.
   */
  const ensureTodayTask = useCallback(
    async (bill: RecurringBill) => {
      if (!userId) return;
      const today = getAppDate();
      if (!billOccurrences(bill, today, today).length) return;
      await supabase.from("tasks").upsert(
        {
          title: billTaskTitle(bill.name),
          description: `${Number(bill.amount).toFixed(2)} zł`,
          category: BILL_TASK_CATEGORY,
          priority: 2,
          due_date: today,
          status: "pending",
          user_id: userId,
          for_user_id: userId,
          recurring_bill_id: bill.id,
          bill_due_date: today,
        },
        { onConflict: "recurring_bill_id,bill_due_date", ignoreDuplicates: true }
      );
    },
    [supabase, userId]
  );

  const saveBill = useCallback(
    async (bill: Omit<RecurringBill, "id" | "user_id"> & { id?: string }) => {
      if (!userId) return null;
      const row = {
        name: bill.name.trim().slice(0, 120),
        amount: Math.max(0, Number(bill.amount) || 0),
        category_id: bill.category_id,
        profile_id: bill.profile_id,
        start_date: bill.start_date,
        recurrence: bill.recurrence,
        active: bill.active,
        updated_at: new Date().toISOString(),
      };
      const query = bill.id
        ? supabase.from("recurring_bills").update(row).eq("id", bill.id).select().single()
        : supabase
            .from("recurring_bills")
            .insert({ ...row, user_id: userId })
            .select()
            .single();
      const { data, error } = await query;
      if (error || !data) {
        toast.error("Nie udało się zapisać rachunku.");
        return null;
      }
      const saved = { ...(data as RecurringBill), amount: Number((data as RecurringBill).amount) };
      setBills((list) => (bill.id ? list.map((b) => (b.id === saved.id ? saved : b)) : [...list, saved]));
      await ensureTodayTask(saved);
      toast.success(bill.id ? "Zapisano rachunek." : "Dodano rachunek.");
      return saved;
    },
    [supabase, userId, toast, ensureTodayTask]
  );

  const removeBill = useCallback(
    async (id: string) => {
      const ok = await toast.confirm("Usunąć rachunek stały? Powiązane transakcje zostaną, bez powiązania.");
      if (!ok) return;
      const previous = bills;
      setBills((list) => list.filter((b) => b.id !== id));
      const { error } = await supabase.from("recurring_bills").delete().eq("id", id);
      if (error) {
        setBills(previous);
        toast.error("Nie udało się usunąć rachunku.");
      }
    },
    [supabase, bills, toast]
  );

  return { bills, loading, fetchBills, saveBill, removeBill };
}

// --- Transakcje ------------------------------------------------------------------------

interface TransactionsOptions {
  from: string;
  to: string;
}

function normalizeTx(t: Transaction): Transaction {
  return { ...t, amount: Number(t.amount) };
}

export function useTransactions({ from, to }: TransactionsOptions) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("Nie udało się pobrać transakcji.");
      return;
    }
    setTransactions(((data ?? []) as Transaction[]).map(normalizeTx));
  }, [supabase, userId, from, to, toast]);

  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);

  /** Historia do sugestii (D1/D2): transakcje z kategorią lub powiązaniem z 12 miesięcy. */
  const loadHistory = useCallback(async (): Promise<Transaction[]> => {
    if (!userId) return [];
    const since = format(addMonths(parseISO(getAppDate()), -FINANCE_HISTORY_MONTHS), "yyyy-MM-dd");
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", since)
      .or("category_id.not.is.null,recurring_bill_id.not.is.null")
      .order("date", { ascending: false })
      .limit(3000);
    return ((data ?? []) as Transaction[]).map(normalizeTx);
  }, [supabase, userId]);

  /**
   * Uzupełnia transakcję sugestiami: kategorią (D2, gdy brak) i powiązaniem
   * z rachunkiem stałym (D1, oznaczone jako „suggested” do weryfikacji).
   */
  const withSuggestions = useCallback(
    (
      tx: NewTransaction,
      bills: readonly RecurringBill[],
      history: readonly Transaction[],
      categories: readonly BudgetCategory[],
      allCategoryNames: ReadonlyMap<string, string>
    ): NewTransaction => {
      const next = { ...tx };
      if (!next.category_id) {
        const name = suggestCategoryName(next, history, allCategoryNames);
        const match = name
          ? categories.find((c) => c.name.toLocaleLowerCase("pl") === name.toLocaleLowerCase("pl"))
          : undefined;
        if (match) next.category_id = match.id;
      }
      if (!next.recurring_bill_id) {
        const link = suggestBillLink(next, bills, history);
        if (link) {
          next.recurring_bill_id = link.billId;
          next.link_status = "suggested";
          const bill = bills.find((b) => b.id === link.billId);
          if (!next.category_id && bill?.category_id) next.category_id = bill.category_id;
        }
      }
      return next;
    },
    []
  );

  const addTransaction = useCallback(
    async (tx: NewTransaction) => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("transactions")
        .insert({ ...tx, user_id: userId, description: tx.description.trim().slice(0, 300) })
        .select()
        .single();
      if (error || !data) {
        toast.error("Nie udało się dodać transakcji.");
        return null;
      }
      const saved = normalizeTx(data as Transaction);
      if (saved.date >= from && saved.date <= to) setTransactions((list) => [saved, ...list]);
      return saved;
    },
    [supabase, userId, from, to, toast]
  );

  const updateTransaction = useCallback(
    async (id: string, patch: Partial<Omit<Transaction, "id" | "user_id">>) => {
      const previous = transactions;
      setTransactions((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      const { error } = await supabase.from("transactions").update(patch).eq("id", id);
      if (error) {
        setTransactions(previous);
        toast.error("Nie udało się zapisać transakcji.");
      }
    },
    [supabase, transactions, toast]
  );

  /** Ręczne powiązanie (lub zatwierdzenie sugestii) – z niego system uczy się na kolejne miesiące. */
  const linkToBill = useCallback(
    (id: string, billId: string | null) =>
      updateTransaction(id, { recurring_bill_id: billId, link_status: billId ? "manual" : null }),
    [updateTransaction]
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      const ok = await toast.confirm("Usunąć transakcję?");
      if (!ok) return;
      const previous = transactions;
      setTransactions((list) => list.filter((t) => t.id !== id));
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) {
        setTransactions(previous);
        toast.error("Nie udało się usunąć transakcji.");
      }
    },
    [supabase, transactions, toast]
  );

  /**
   * Import z CSV: klucz deduplikacji (dzień, kwota, kierunek, opis, kolejność
   * w pliku) + unikalny indeks w bazie – ponowny import tego samego wyciągu
   * nic nie dubluje.
   */
  const importTransactions = useCallback(
    async (rows: NewTransaction[]) => {
      if (!userId || rows.length === 0) return { added: 0, skipped: 0 };
      const seen = new Map<string, number>();
      const prepared = rows.map((r) => {
        const base = importKey(r);
        const n = seen.get(base) ?? 0;
        seen.set(base, n + 1);
        return { ...r, user_id: userId, source: "csv" as const, import_key: importKey(r, n) };
      });
      const { data, error } = await supabase
        .from("transactions")
        .upsert(prepared, { onConflict: "user_id,import_key", ignoreDuplicates: true })
        .select("id");
      if (error) {
        toast.error("Nie udało się zaimportować transakcji.");
        return { added: 0, skipped: 0 };
      }
      const added = data?.length ?? 0;
      await fetchTransactions();
      return { added, skipped: prepared.length - added };
    },
    [supabase, userId, toast, fetchTransactions]
  );

  return {
    transactions,
    loading,
    fetchTransactions,
    loadHistory,
    withSuggestions,
    addTransaction,
    updateTransaction,
    linkToBill,
    removeTransaction,
    importTransactions,
  };
}

/** Mapa id → nazwa dla kategorii z kilku lat (do sugestii D2 między latami). */
export function useCategoryNameMap(categories: readonly BudgetCategory[], previous: readonly BudgetCategory[] = []) {
  return useMemo(() => new Map([...previous, ...categories].map((c) => [c.id, c.name])), [categories, previous]);
}
