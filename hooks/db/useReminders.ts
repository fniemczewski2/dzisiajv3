// hooks/useReminders.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import { Reminder } from "@/types/reminders";
import { getAppDate, getAppDateTime } from "@/lib/dateUtils";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/lib/withRetry";

export function useReminders() {
  const { user, supabase } = useAuth();
  const userId = user?.id;

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const withRetry = useRetry();

  const today = getAppDate();

  const fetchReminders = useCallback(async () => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setFetching(true);
    try {
      const { data, error } = await withRetry(async () =>
        supabase.from("reminders").select("*").eq("user_id", userId).order("data_poczatkowa", { ascending: true })
      );

      if (error) throw error;
      setReminders((data as Reminder[]) || []);
    } catch {
      toast.error("Błąd pobierania zadań cyklicznych.");
    } finally {
      setFetching(false);
    }
  }, [supabase, userId, toast, withRetry]);

  const addReminder = useCallback(
    async (tytul: string, dataPoczatkowa: string, powtarzanie: number) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const tempId = `temp-${Date.now()}`;
      const optimisticReminder = {
        id: tempId,
        user_id: userId,
        tytul,
        data_poczatkowa: dataPoczatkowa,
        powtarzanie,
        done: null,
      } as Reminder;
      setReminders((prev) => [...prev, optimisticReminder]);

      try {
        const { data, error } = await withRetry(async () =>
          supabase
            .from("reminders")
            .insert({ user_id: userId, tytul, data_poczatkowa: dataPoczatkowa, powtarzanie, done: null })
            .select()
            .single()
        );

        if (error) throw error;
        setReminders((prev) => prev.map((r) => (r.id === tempId ? (data as Reminder) : r)));
        toast.success("Dodano zadanie cykliczne");
      } catch {
        setReminders((prev) => prev.filter((r) => r.id !== tempId));
        toast.error("Błąd dodawania zadania cyklicznego.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, toast, withRetry]
  );

  const postponeReminder = useCallback(
    async (id: string, powtarzanie: number) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const previous = reminders;

      try {
        const dt = getAppDateTime();
        dt.setDate(dt.getDate() + 1 - powtarzanie);
        const done = dt.toISOString().slice(0, 10);

        const { data, error } = await withRetry(async () =>
          supabase.from("reminders").update({ done }).eq("id", id).select().single()
        );

        if (error) throw error;
        setReminders((prev) => prev.map((r) => (r.id === id ? (data as Reminder) : r)));
        toast.success("Przełożono zadanie cykliczne");
      } catch {
        setReminders(previous);
        toast.error("Błąd przekładania zadania cyklicznego.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, reminders, toast, withRetry]
  );

  const completeReminder = useCallback(
    async (id: string) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const previous = reminders;

      try {
        const { data, error } = await withRetry(async () =>
          supabase.from("reminders").update({ done: today }).eq("id", id).select().single()
        );

        if (error) throw error;
        setReminders((prev) => prev.map((r) => (r.id === id ? (data as Reminder) : r)));
        toast.success("Wykonano zadanie cykliczne");
      } catch {
        setReminders(previous);
        toast.error("Błąd wykonania zadania cyklicznego.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, today, reminders, toast, withRetry]
  );

  const deleteReminder = useCallback(
    async (id: string) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      const ok = await toast.confirm(`Czy chcesz usunąć zadanie cykliczne?`);
      if (!ok) return;
      setLoading(true);
      const previous = reminders;
      setReminders((prev) => prev.filter((r) => r.id !== id));

      try {
        const { error } = await withRetry(async () => supabase.from("reminders").delete().eq("id", id));
        if (error) throw error;
        toast.success("Usunięto zadanie cykliczne");
      } catch {
        setReminders(previous);
        toast.error("Błąd usuwania zadania cyklicznego.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, reminders, toast, withRetry]
  );

  const visibleReminders = useMemo(() => {
    return reminders.filter((r) => {
      if (r.data_poczatkowa > today) return false;
      if (!r.done) return true;
      const nextDue = new Date(r.done);
      nextDue.setDate(nextDue.getDate() + r.powtarzanie);
      return today >= nextDue.toISOString().slice(0, 10);
    });
  }, [reminders, today]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  return {
    allReminders: reminders,
    visibleReminders,
    addReminder,
    completeReminder,
    postponeReminder,
    deleteReminder,
    fetchReminders,
    fetching,
    loading,
  };
}
