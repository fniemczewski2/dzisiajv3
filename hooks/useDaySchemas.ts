import { useEffect, useState, useCallback } from "react";
import { Schema } from "../types";
import { useAuth } from "../providers/AuthProvider";

export function useDaySchemas() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSchemas = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("day_schemas") 
      .select("*")
      .eq("user_id", userId);
    
    // Parse both days and entries from JSON strings if they come back as strings
    const parsedSchemas = (data as any[])?.map(schema=> ({
      ...schema,
      days: typeof schema.days === 'string' ? JSON.parse(schema.days) : schema.days,
      entries: typeof schema.entries === 'string' ? JSON.parse(schema.entries) : schema.entries
    })) || [];
    
    setSchemas(parsedSchemas);
    setLoading(false);
  }, [userId, supabase]);

  const addSchema = async (schema: Schema) => {
    if (!userId) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from("day_schemas")
      .insert({ 
        user_id: userId, 
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
    
    const { error } = await supabase.from("day_schemas").update({
      name: payload.name,
      // FIX: Removed JSON.stringify to send raw arrays/objects like in addSchema
      days: payload.days,
      entries: payload.entries,
    }).eq("id", id);

    if (error) {
        console.error("Update error:", error);
        alert(`Error updating schema: ${error.message}`);
    }

    await fetchSchemas();
    setLoading(false);
  };

  const deleteSchema = async (id: string) => {
    if (!userId) return;
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