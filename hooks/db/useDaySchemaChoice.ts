// hooks/db/useDaySchemaChoice.ts
//
// Ręczny wybór schematu na konkretny dzień (tabela day_schema_choices).
// Zmiana schematu czyści przesunięcia/ukrycia rutyn z tego dnia
// (daily_overrides), bo dotyczyły punktów poprzedniego schematu.

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import type { SchemaChoice } from "@/lib/daySchemas";

export type SchemaChoiceInput = "default" | "none" | string;

export function useDaySchemaChoice(dateStr: string, onOverridesCleared?: () => void) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const [choice, setChoiceState] = useState<SchemaChoice>(undefined);
  const [available, setAvailable] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId || !supabase) return;
    let cancelled = false;
    setChoiceState(undefined);
    void (async () => {
      const { data, error } = await supabase
        .from("day_schema_choices")
        .select("schema_id")
        .eq("user_id", userId)
        .eq("date", dateStr)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        // Tabela jeszcze nie istnieje (przed migracją) – przełącznik ukryty.
        setAvailable(false);
        return;
      }
      setAvailable(true);
      setChoiceState(data ? ((data as { schema_id: string | null }).schema_id ?? null) : undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId, dateStr]);

  const setChoice = useCallback(
    async (input: SchemaChoiceInput) => {
      if (!userId) return;
      const previous = choice;
      const next: SchemaChoice = input === "default" ? undefined : input === "none" ? null : input;
      setChoiceState(next);
      setSaving(true);
      try {
        const { error } =
          next === undefined
            ? await supabase.from("day_schema_choices").delete().eq("user_id", userId).eq("date", dateStr)
            : await supabase
                .from("day_schema_choices")
                .upsert({ user_id: userId, date: dateStr, schema_id: next }, { onConflict: "user_id,date" });
        if (error) throw error;
        await supabase.from("daily_overrides").delete().eq("user_id", userId).eq("date", dateStr);
        onOverridesCleared?.();
      } catch {
        setChoiceState(previous);
        toast.error("Nie udało się zmienić schematu dnia.");
      } finally {
        setSaving(false);
      }
    },
    [supabase, userId, dateStr, choice, toast, onOverridesCleared]
  );

  return { choice, setChoice, available, saving };
}
