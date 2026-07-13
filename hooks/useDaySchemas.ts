// hooks/useDaySchemas.ts

import { useEffect, useState, useCallback } from "react";
import { Schema } from "@/types";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

export function useDaySchemas() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  useEffect(() => {
    let toastId: string | undefined;
    if (fetching  && toast.loading) toastId = toast.loading("Ładowanie schematów...");
    return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [fetching, toast]);

  const fetchSchemas = useCallback(async () => {
    if (!userId) return;
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("day_schemas")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;

      setSchemas(
        (data as any[])?.map((s) => ({
          ...s,
          days: typeof s.days === "string" ? JSON.parse(s.days) : s.days,
          entries: typeof s.entries === "string" ? JSON.parse(s.entries) : s.entries,
        })) || []
      );
    } finally {
      setFetching(false);
    }
  }, [userId, supabase]);

  const addSchema = async (schema: Schema) => {
    if (!userId) toast.error("Zaloguj się!");
    setLoading(true);
    try {
      const { data, error } = await supabase.from("day_schemas").insert({
        user_id: userId,
        name: schema.name,
        days: schema.days,
        entries: schema.entries,
      }).select().single();
      if (error) throw error;
      setSchemas((prev) => [...prev, {
        ...data,
        days: typeof data.days === "string" ? JSON.parse(data.days) : data.days,
        entries: typeof data.entries === "string" ? JSON.parse(data.entries) : data.entries,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const updateSchema = async (id: string, payload: Omit<Schema, "id">) => {
    setLoading(true);

    setSchemas((prev) => prev.map(s => s.id === id ? { ...s, ...payload } : s));

    try {
      const { error } = await supabase
        .from("day_schemas")
        .update({ name: payload.name, days: payload.days, entries: payload.entries })
        .eq("id", id);
      if (error) {
      await fetchSchemas();
      throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteSchema = async (id: string) => {
    if (!userId) toast.error("Zaloguj się!");
    const ok = await toast.confirm(
      `Czy chcesz usunąć schemat?`
    );
    if (!ok) return;
    setLoading(true);

    setSchemas((prev) => prev.filter(s => s.id !== id));

    try {
      const { error } = await supabase.from("day_schemas").delete().eq("id", id);
      if (error) {
         fetchSchemas(); 
         throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemas();
  }, [fetchSchemas]);

  return { schemas, loading, fetching, fetchSchemas, addSchema, updateSchema, deleteSchema };
}