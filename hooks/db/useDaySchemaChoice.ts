// hooks/db/useDaySchemaChoice.ts
//
// Ręczny wybór schematu na konkretny dzień (tabela day_schema_choices).
// Zmiana schematu czyści przesunięcia/ukrycia rutyn z tego dnia
// (daily_overrides), bo dotyczyły punktów poprzedniego schematu.

import { useQueryState } from "@/hooks/useQueryState";
import { useCallback, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import type { SchemaChoice } from "@/lib/daySchemas";

/** „default” = schemat domyślny, „none” = bez schematu, inna wartość = id schematu. */
function toChoice(input: string): SchemaChoice {
  if (input === "default") return undefined;
  if (input === "none") return null;
  return input;
}

interface ChoiceState {
  choice: SchemaChoice;
  available: boolean;
}

const INITIAL_CHOICE: ChoiceState = { choice: undefined, available: true };

export function useDaySchemaChoice(dateStr: string, onOverridesCleared?: () => void) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Brak tabeli (przed migracją bazy) – przełącznik schematu jest ukryty.
  const queryChoice = useCallback(
    async ({ signal }: { signal: AbortSignal }): Promise<ChoiceState> => {
      const { data, error } = await supabase
        .from("day_schema_choices")
        .select("schema_id")
        .eq("user_id", userId as string)
        .eq("date", dateStr)
        .abortSignal(signal)
        .maybeSingle();
      if (error) return { choice: undefined, available: false };
      return { choice: data ? ((data as { schema_id: string | null }).schema_id ?? null) : undefined, available: true };
    },
    [supabase, userId, dateStr]
  );
  const { data: choiceState, setData: setChoiceState } = useQueryState<ChoiceState>({
    queryKey: ["day-schema-choice", userId ?? null, dateStr],
    queryFn: queryChoice,
    initial: INITIAL_CHOICE,
    enabled: Boolean(userId && supabase),
  });
  const { choice, available } = choiceState;
  const setChoice = useCallback(
    (next: SchemaChoice) => setChoiceState((prev) => ({ ...prev, choice: next })),
    [setChoiceState]
  );

  const chooseSchema = useCallback(
    async (input: string) => {
      if (!userId) return;
      const previous = choice;
      const next = toChoice(input);
      setChoice(next);
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
        setChoice(previous);
        toast.error("Nie udało się zmienić schematu dnia.");
      } finally {
        setSaving(false);
      }
    },
    [supabase, userId, dateStr, choice, toast, onOverridesCleared, setChoice]
  );

  return { choice, setChoice: chooseSchema, available, saving };
}
