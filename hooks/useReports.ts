// hooks/useReports.ts

import { useEffect, useState, useCallback } from "react";
import { Report } from "@/types";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

export function useReports() {
  const { user, supabase } = useAuth();
  const userId = user?.id;

  const [reports, setReports] = useState<Report[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  useEffect(() => {
    let toastId: string | undefined;
    if (fetching  && toast.loading) toastId = toast.loading("Ładowanie celów...");
    return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [fetching, toast]);

  const fetchReports = useCallback(async () => {
    if (!userId) return;
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false });
      if (error) throw error;
      setReports((data || []) as Report[]);
    } finally {
      setFetching(false);
    }
  }, [supabase, userId]);

  const addReport = useCallback(
    async (payload: Omit<Report, "id" | "inserted_at" | "updated_at">) => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("reports")
          .insert([{ ...payload, user_id: userId }])
          .select()
          .single();
        if (error) throw error;
        setReports((prev) => [data as Report, ...prev]);
      } finally {
        setLoading(false)
      }
    },
    [supabase, userId]
  );

  const editReport = useCallback(
    async (id: string, updates: Partial<Report>) => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("reports")
          .update(updates)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        setReports((prev) => prev.map((r) => (r.id === id ? (data as Report) : r)));
      } finally {
        setLoading(false)
      }
    },
    [supabase, userId]
  );

  const deleteReport = useCallback(
    async (id: string) => {
      const ok = await toast.confirm(
        `Czy chcesz usunąć raport?`
      );
      if (!ok) return;
      setLoading(true)
      try {
        const { error } = await supabase.from("reports").delete().eq("id", id);
        if (error) throw error;
        setReports((prev) => prev.filter((r) => r.id !== id));
      } finally {
        setLoading(false)
      }
    },
    [supabase]
  );

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, loading, fetching, fetchReports, addReport, editReport, deleteReport };
}