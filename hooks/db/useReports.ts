// hooks/useReports.ts
import { useEffect, useState, useCallback } from "react";
import { Report } from "@/types/reports";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/lib/withRetry";

export function useReports() {
  const { user, supabase } = useAuth();
  const userId = user?.id;

  const [reports, setReports] = useState<Report[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const withRetry = useRetry();

  const fetchReports = useCallback(async () => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setFetching(true);
    try {
      const { data, error } = await withRetry(async () =>
        supabase.from("reports").select("*").eq("user_id", userId).order("date", { ascending: false })
      );
      if (error) throw error;
      setReports((data || []) as Report[]);
    } catch {
      toast.error("Błąd pobierania raportów.");
    } finally {
      setFetching(false);
    }
  }, [supabase, userId, toast, withRetry]);

  const addReport = useCallback(
    async (payload: Omit<Report, "id" | "inserted_at" | "updated_at">) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const tempId = `temp-${Date.now()}`;
      const optimisticReport = { ...payload, id: tempId, user_id: userId } as Report;
      setReports((prev) => [optimisticReport, ...prev]);

      try {
        const { data, error } = await withRetry(async () =>
          supabase.from("reports").insert([{ ...payload, user_id: userId }]).select().single()
        );
        if (error) throw error;
        setReports((prev) => prev.map((r) => (r.id === tempId ? (data as Report) : r)));
        toast.success("Dodano raport");
      } catch {
        setReports((prev) => prev.filter((r) => r.id !== tempId));
        toast.error("Błąd dodawania raportu.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, toast, withRetry]
  );

  const editReport = useCallback(
    async (id: string, updates: Partial<Report>) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const previous = reports;
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));

      try {
        const { data, error } = await withRetry(async () =>
          supabase.from("reports").update(updates).eq("id", id).select().single()
        );
        if (error) throw error;
        setReports((prev) => prev.map((r) => (r.id === id ? (data as Report) : r)));
        toast.success("Zaktualizowano raport");
      } catch {
        setReports(previous);
        toast.error("Błąd aktualizacji raportu.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, reports, toast, withRetry]
  );

  const deleteReport = useCallback(
    async (id: string) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      const ok = await toast.confirm(`Czy chcesz usunąć raport?`);
      if (!ok) return;
      setLoading(true);
      const previous = reports;
      setReports((prev) => prev.filter((r) => r.id !== id));

      try {
        const { error } = await withRetry(async () => supabase.from("reports").delete().eq("id", id));
        if (error) throw error;
        toast.success("Usunięto raport");
      } catch {
        setReports(previous);
        toast.error("Błąd usuwania raportu.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, reports, toast, withRetry]
  );

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, loading, fetching, fetchReports, addReport, editReport, deleteReport };
}
