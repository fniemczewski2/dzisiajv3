// hooks/db/useDailyOverrides.ts

import { useQueryState } from "@/hooks/useQueryState";
import { NotSignedInError } from "@/lib/errors";
import { useState, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";
import { isAbortError } from "@/lib/abortUtils";
import { DailyOverride } from "@/types/schemas";

const NO_OVERRIDES: DailyOverride[] = [];

export function useDailyOverrides(dateStr: string) {
  const { supabase, user } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const withRetry = useRetry();
  const [loading, setLoading] = useState(false);

  const queryOverrides = useCallback(
    async ({ signal }: { signal: AbortSignal }): Promise<DailyOverride[]> => {
      if (!userId) throw new NotSignedInError();
      try {
        const { data, error } = await withRetry(
          () =>
            supabase
              .from("daily_overrides")
              .select("schema_id, new_time, is_hidden")
              .eq("user_id", userId)
              .eq("date", dateStr)
              .abortSignal(signal),
          signal
        );
        if (error) throw error;
        return (data || []) as DailyOverride[];
      } catch (err) {
        if (!isAbortError(err)) toast.error("Błąd pobierania rutyn dnia.");
        throw err;
      }
    },
    [supabase, userId, dateStr, toast, withRetry]
  );
  const {
    data: overrides,
    setData: setOverrides,
    fetching,
    refetch: fetchOverrides,
  } = useQueryState<DailyOverride[]>({
    queryKey: ["daily-overrides", userId ?? null, dateStr],
    queryFn: queryOverrides,
    initial: NO_OVERRIDES,
    enabled: Boolean(userId),
  });

  const hideSchema = useCallback(
    async (schemaId: string) => {
      if (!userId) {
        throw new NotSignedInError();
      }

      setLoading(true);
      const previous = overrides;
      setOverrides((prev) => {
        const existing = prev.find((o) => o.schema_id === schemaId);
        if (existing) {
          return prev.map((o) => (o.schema_id === schemaId ? { ...o, is_hidden: true } : o));
        }
        return [...prev, { schema_id: schemaId, is_hidden: true }];
      });

      try {
        const { data: existing } = await withRetry(() =>
          supabase
            .from("daily_overrides")
            .select("id")
            .eq("user_id", userId)
            .eq("date", dateStr)
            .eq("schema_id", schemaId)
            .maybeSingle()
        );

        const { error } = existing
          ? await withRetry(() => supabase.from("daily_overrides").update({ is_hidden: true }).eq("id", existing.id))
          : await withRetry(() =>
              supabase.from("daily_overrides").insert({
                user_id: userId,
                date: dateStr,
                schema_id: schemaId,
                is_hidden: true,
              })
            );

        if (error) throw error;
        toast.success("Ukryto rutynę");
      } catch {
        setOverrides(previous);
        toast.error("Błąd ukrywania rutyny.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, dateStr, overrides, toast, withRetry, setOverrides]
  );

  const moveSchema = useCallback(
    async (schemaId: string, newTime: string) => {
      if (!userId) {
        throw new NotSignedInError();
      }

      setLoading(true);
      const previous = overrides;
      setOverrides((prev) => {
        const existing = prev.find((o) => o.schema_id === schemaId);
        if (existing) {
          return prev.map((o) => (o.schema_id === schemaId ? { ...o, new_time: newTime, is_hidden: false } : o));
        }
        return [...prev, { schema_id: schemaId, new_time: newTime, is_hidden: false }];
      });

      try {
        const { data: existing } = await withRetry(() =>
          supabase
            .from("daily_overrides")
            .select("id")
            .eq("user_id", userId)
            .eq("date", dateStr)
            .eq("schema_id", schemaId)
            .maybeSingle()
        );

        const { error } = existing
          ? await withRetry(() =>
              supabase.from("daily_overrides").update({ new_time: newTime, is_hidden: false }).eq("id", existing.id)
            )
          : await withRetry(() =>
              supabase.from("daily_overrides").insert({
                user_id: userId,
                date: dateStr,
                schema_id: schemaId,
                new_time: newTime,
                is_hidden: false,
              })
            );

        if (error) throw error;
        toast.success("Przeniesiono rutynę");
      } catch {
        setOverrides(previous);
        toast.error("Błąd przenoszenia rutyny.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, dateStr, overrides, toast, withRetry, setOverrides]
  );

  return { overrides, loading, fetching, hideSchema, moveSchema, fetchOverrides };
}
