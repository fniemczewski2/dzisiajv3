// hooks/useDaySchemas.ts
import { useEffect, useState, useCallback } from "react";
import { Schema } from "@/types/schemas";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/lib/withRetry";

function parseSchema<T extends { days: any; entries: any }>(raw: T): T {
  return {
    ...raw,
    days: typeof raw.days === "string" ? JSON.parse(raw.days) : raw.days,
    entries: typeof raw.entries === "string" ? JSON.parse(raw.entries) : raw.entries,
  };
}

export function useDaySchemas() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const withRetry = useRetry();

  useEffect(() => {
    let toastId: string | undefined;
    if (fetching && toast.loading) toastId = toast.loading("Ładowanie schematów...");
    return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [fetching, toast]);

  const fetchSchemas = useCallback(async () => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setFetching(true);
    try {
      const { data, error } = await withRetry(async () =>
        supabase.from("day_schemas").select("*").eq("user_id", userId)
      );

      if (error) throw error;
      setSchemas((data ?? []).map(parseSchema));
    } catch {
      toast.error("Błąd pobierania schematów.");
    } finally {
      setFetching(false);
    }
  }, [userId, supabase, toast, withRetry]);

  const addSchema = useCallback(
    async (schema: Schema) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const tempId = `temp-${Date.now()}`;
      const optimisticSchema = { ...schema, id: tempId } as Schema;
      setSchemas((prev) => [...prev, optimisticSchema]);

      try {
        const { data, error } = await withRetry(async () =>
          supabase
            .from("day_schemas")
            .insert({ user_id: userId, name: schema.name, days: schema.days, entries: schema.entries })
            .select()
            .single()
        );
        if (error) throw error;
        setSchemas((prev) => prev.map((s) => (s.id === tempId ? parseSchema(data) : s)));
        toast.success("Dodano schemat");
      } catch {
        setSchemas((prev) => prev.filter((s) => s.id !== tempId));
        toast.error("Błąd dodawania schematu.");
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, toast, withRetry]
  );

  const updateSchema = useCallback(
    async (id: string, payload: Omit<Schema, "id">) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const previous = schemas;
      setSchemas((prev) => prev.map((s) => (s.id === id ? { ...s, ...payload } : s)));

      try {
        const { error } = await withRetry(async () =>
          supabase
            .from("day_schemas")
            .update({ name: payload.name, days: payload.days, entries: payload.entries })
            .eq("id", id)
        );
        if (error) throw error;
        toast.success("Zaktualizowano schemat");
      } catch {
        setSchemas(previous);
        toast.error("Błąd aktualizacji schematu.");
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, schemas, toast, withRetry]
  );

  const deleteSchema = useCallback(
    async (id: string) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      const ok = await toast.confirm(`Czy chcesz usunąć schemat?`);
      if (!ok) return;

      setLoading(true);
      const previous = schemas;
      setSchemas((prev) => prev.filter((s) => s.id !== id));

      try {
        const { error } = await withRetry(async () => supabase.from("day_schemas").delete().eq("id", id));
        if (error) throw error;
        toast.success("Usunięto schemat");
      } catch {
        setSchemas(previous);
        toast.error("Błąd usuwania schematu.");
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, schemas, toast, withRetry]
  );

  useEffect(() => {
    fetchSchemas();
  }, [fetchSchemas]);

  return { schemas, loading, fetching, fetchSchemas, addSchema, updateSchema, deleteSchema };
}
