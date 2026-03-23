// hooks/useReports.ts

import { useEffect, useState, useCallback } from "react";
import { Report } from "../types";
import { useAuth } from "../providers/AuthProvider";

export function useReports() {
  const { user, supabase } = useAuth();
  const userId = user?.id;

  const [reports, setReports] = useState<Report[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

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
      const { data, error } = await supabase
        .from("reports")
        .insert([{ ...payload, user_id: userId }])
        .select()
        .single();
      if (error) throw error;
      try {
        setReports((prev) => [data as Report, ...prev]);
      } finally {
        fetchReports();
        setLoading(false)
      }
    },
    [supabase, userId]
  );

  const editReport = useCallback(
    async (id: string, updates: Partial<Report>) => {
      const { data, error } = await supabase
        .from("reports")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      try {
        setReports((prev) => prev.map((r) => (r.id === id ? (data as Report) : r)));
      } finally {
        fetchReports();
        setLoading(false)
      }
    },
    [supabase]
  );

  const deleteReport = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("reports").delete().eq("id", id);
      if (error) throw error;
      try {
        setReports((prev) => prev.filter((r) => r.id !== id));
      } finally {
        fetchReports();
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