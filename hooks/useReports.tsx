import { useEffect, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Report } from "../types";

export function useReports(userEmail?: string) {
  const supabase = useSupabaseClient();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    if (!userEmail) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("user_email", userEmail)
      .order("date", { ascending: false });

    if (!error && data) setReports(data as Report[]);
    setLoading(false);
  };

  const addReport = async (payload: Omit<Report, "id" | "inserted_at" | "updated_at">) => {
    const { data, error } = await supabase
      .from("reports")
      .insert([payload])
      .select()
      .single();
    if (!error && data) setReports((prev) => [data as Report, ...prev]);
  };

  const updateReport = async (id: string, updates: Partial<Report>) => {
    const { data, error } = await supabase
      .from("reports")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (!error && data) {
      setReports((prev) => prev.map((r) => (r.id === id ? (data as Report) : r)));
    }
  };

  const deleteReport = async (id: string) => {
    await supabase.from("reports").delete().eq("id", id);
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  return { reports, loading, fetchReports, addReport, updateReport, deleteReport };
}
