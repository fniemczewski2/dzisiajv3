// hooks/useDaySchemas.ts
import { useEffect, useState, useCallback } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { ScheduleItem, Schema } from "../types";

export function useDaySchemas() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const userEmail = session?.user?.email || "";
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSchemas = async () => {
    if (!userEmail) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("day_schemas")
      .select("*")
      .eq("user_name", userEmail);
    setSchemas(data || []);
    setLoading(false);
  };

  const addSchema = async (schema: Schema) => {
    if (!userEmail) return;
    setLoading(true);
    const { data } = await supabase
      .from("day_schemas")
      .insert({ user_name: userEmail, schema })
      .select()
      .single();
    setSchemas((prev) => [...prev, data]);
    await fetchSchemas();
  };

  const updateSchema = async (id: string, payload: Omit<Schema, "id">) => {
    await supabase.from("day_schemas").update({
      name: payload.name,
      days: payload.days,
      entries: payload.entries,
    }).eq("id", id);
    await fetchSchemas();
  };

  const deleteSchema = async (id: string) => {
    if (!userEmail) return;
    setLoading(true);
    await supabase.from("day_schemas").delete().eq("id", id);
    await fetchSchemas();
    setLoading(false);
  };

  useEffect(() => {
    fetchSchemas();
  }, [fetchSchemas]);

  return {
    schemas,
    loading,
    refresh: fetchSchemas,
    addSchema,
    updateSchema,
    deleteSchema,
  };
}
