import { useEffect, useState, useCallback } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { ScheduleItem, Schema } from "../types";

export function useDaySchemas() {
  const session = useSession();
  const supabase = useSupabaseClient();

  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchemas = useCallback(async () => {
    if (!session?.user?.email) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("day_schemas")
      .select("*")
      .eq("user_name", session?.user?.email);

    if (error) {
      console.error("Error fetching day schemas:", error.message);
    }

    if (data) {
      const normalized = data.map((schema: any) => ({
        ...schema,
        entries: Array.isArray(schema.entries) ? schema.entries : [],
      }));
      setSchemas(normalized);
    }

    setLoading(false);
  }, [session, supabase]);

  useEffect(() => {
    fetchSchemas();
  }, [fetchSchemas]);

  const addSchema = async (payload: Omit<Schema, "id">) => {
    await supabase.from("day_schemas").insert({
      user_name: session?.user?.email,
      name: payload.name,
      days: payload.days,
      entries: payload.entries,
    });
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
    await supabase.from("day_schemas").delete().eq("id", id);
    await fetchSchemas();
 };

  return {
    schemas,
    loading,
    refresh: fetchSchemas,
    addSchema,
    updateSchema,
    deleteSchema,
  };
}
