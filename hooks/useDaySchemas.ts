// hooks/useDaySchemas.ts

import { useEffect, useState, useCallback } from "react";
import { Schema } from "../types";
import { useAuth } from "../providers/AuthProvider";

export function useDaySchemas() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

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
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    try {
      const { error } = await supabase.from("day_schemas").insert({
        user_id: userId,
        name: schema.name,
        days: schema.days,
        entries: schema.entries,
      });
      if (error) throw error;
      await fetchSchemas();
    } finally {
      setLoading(false);
    }
  };

  const updateSchema = async (id: string, payload: Omit<Schema, "id">) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("day_schemas")
        .update({ name: payload.name, days: payload.days, entries: payload.entries })
        .eq("id", id);
      if (error) throw error;
      await fetchSchemas();
    } finally {
      setLoading(false);
    }
  };

  const deleteSchema = async (id: string) => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    try {
      const { error } = await supabase.from("day_schemas").delete().eq("id", id);
      if (error) throw error;
      await fetchSchemas();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemas();
  }, [fetchSchemas]);

  return { schemas, loading, fetching, fetchSchemas, addSchema, updateSchema, deleteSchema };
}