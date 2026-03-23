// hooks/useBills.ts

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../providers/AuthProvider";
import { useSettings } from "./useSettings";
import type { Bill } from "../types";
import { addMonths, format, parseISO, isAfter } from "date-fns";

function getRecurringDates(startDate: string, recurringUntil: string): string[] {
  const dates: string[] = [];
  let current = addMonths(parseISO(startDate), 1);
  const until = parseISO(recurringUntil);

  while (!isAfter(current, until)) {
    dates.push(format(current, "yyyy-MM-dd"));
    current = addMonths(current, 1);
  }
  return dates;
}

interface FetchOptions {
  dateFrom?: string;
  dateTo?: string;
  includeRecurringChildren?: boolean;
}

export function useBills(options: FetchOptions = {}) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { settings } = useSettings();

  const [incomeItems, setIncomeItems] = useState<Bill[]>([]);
  const [expenseItems, setExpenseItems] = useState<Bill[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchBills = useCallback(async () => {
    if (!userId || settings == null) return;
    setFetching(true);
    try {
      let query = supabase
        .from("bills")
        .select(`
          *,
          category:budget_categories(*)
        `)
        .eq("user_id", userId)
        .order("date", { ascending: true });

      if (options.dateFrom) query = query.gte("date", options.dateFrom);
      if (options.dateTo)   query = query.lte("date", options.dateTo);
      if (!options.includeRecurringChildren) {
        query = query.is("parent_bill_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;

      const bills = (data ?? []) as Bill[];
      setIncomeItems(bills.filter((b) => b.is_income));

      if (settings.show_budget_items) {
        setExpenseItems(bills.filter((b) => !b.is_income));
      }
    } finally {
      setFetching(false);
    }
  }, [userId, settings, supabase, options.dateFrom, options.dateTo, options.includeRecurringChildren]);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  const addBill = useCallback(
    async (
      bill: Omit<Bill, "id" | "user_id" | "parent_bill_id">
    ): Promise<Bill> => {
      if (!userId) throw new Error("Musisz być zalogowany");
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("bills")
          .insert({ ...bill, user_id: userId, parent_bill_id: null })
          .select()
          .single();

        if (error) throw error;
        const parent = data as Bill;

        if (bill.is_recurring && bill.recurring_until) {
          const childDates = getRecurringDates(bill.date, bill.recurring_until);
          if (childDates.length > 0) {
            const children = childDates.map((date) => ({
              user_id:          userId,
              amount:           bill.amount,
              description:      bill.description,
              date,
              is_income:        bill.is_income,
              done:             false,
              category_id:      bill.category_id,
              is_recurring:     false,   
              recurring_until:  null,
              parent_bill_id:   parent.id,
            }));

            const { error: childError } = await supabase
              .from("bills")
              .insert(children);

            if (childError) throw childError;
          }
        }

        return parent;
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId]
  );

  const editBill = useCallback(
    async (
      bill: Bill,
      options: { updateFutureRecurring?: boolean } = {}
    ): Promise<Bill> => {
      if (!userId) throw new Error("Musisz być zalogowany");
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("bills")
          .update({
            amount:          bill.amount,
            description:     bill.description,
            date:            bill.date,
            is_income:       bill.is_income,
            done:            bill.done,
            category_id:     bill.category_id,
            is_recurring:    bill.is_recurring,
            recurring_until: bill.recurring_until,
          })
          .eq("id", bill.id)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throw error;
        if (options.updateFutureRecurring) {
          const today = format(new Date(), "yyyy-MM-dd");
          await supabase
            .from("bills")
            .update({
              amount:      bill.amount,
              description: bill.description,
              category_id: bill.category_id,
            })
            .eq("parent_bill_id", bill.id)
            .gte("date", today);
        }

        return data as Bill;
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId]
  );


  const deleteBill = useCallback(
    async (id: string, deleteFutureRecurring = false): Promise<void> => {
      if (!userId) throw new Error("Musisz być zalogowany");
      setLoading(true);
      try {
        if (deleteFutureRecurring) {
          const today = format(new Date(), "yyyy-MM-dd");
          await supabase
            .from("bills")
            .delete()
            .eq("parent_bill_id", id)
            .gte("date", today);
        }

        const { error } = await supabase
          .from("bills")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);

        if (error) throw error;
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId]
  );

  const markAsDone = useCallback(
    async (id: string): Promise<void> => {
      if (!userId) throw new Error("Musisz być zalogowany");
      setLoading(true);
      try {
        const { error } = await supabase
          .from("bills")
          .update({ done: true })
          .eq("id", id)
          .eq("user_id", userId);

        if (error) throw error;
        setIncomeItems((prev) => prev.filter((b) => b.id !== id));
        setExpenseItems((prev) => prev.filter((b) => b.id !== id));
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId]
  );

  return {
    incomeItems,
    expenseItems,
    fetching,
    loading,
    fetchBills,
    addBill,
    editBill,
    deleteBill,
    markAsDone,
  };
}