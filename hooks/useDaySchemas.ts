import { useEffect, useState, useCallback } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { ScheduleItem, Schema } from "../types";

export function useDaySchemas() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const userEmail = session?.user?.email || process.env.NEXT_PUBLIC_USER_EMAIL;
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSchemas = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("day_schemas")
      .select("*")
      .eq("user_name", userEmail);
    
    // Parse both days and entries from JSON strings
    const parsedSchemas = data?.map(schema => ({
      ...schema,
      days: typeof schema.days === 'string' ? JSON.parse(schema.days) : schema.days,
      entries: typeof schema.entries === 'string' ? JSON.parse(schema.entries) : schema.entries
    })) || [];
    
    setSchemas(parsedSchemas);
    setLoading(false);
  }, [userEmail, supabase]);

  const addSchema = async (schema: Schema) => {
    if (!userEmail) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from("day_schemas")
      .insert({ 
        user_name: userEmail, 
        name: schema.name,
        days: schema.days,  
        entries: schema.entries  
      })
      .select()
      .single();
    
    if (error) {
      console.error("Supabase error:", error);
      alert(`Error: ${error.message}`);
      setLoading(false);
      return;
    }
    
    await fetchSchemas();
    setLoading(false);
  };

  const updateSchema = async (id: string, payload: Omit<Schema, "id">) => {
    setLoading(true);
    await supabase.from("day_schemas").update({
      name: payload.name,
      days: JSON.stringify(payload.days),
      entries: JSON.stringify(payload.entries),
    }).eq("id", id);
    await fetchSchemas();
    setLoading(false);
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