// hooks/useDailyOverrides.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { useRetry } from '@/hooks/useRetry';
import { DailyOverride } from '@/types/schemas';

export function useDailyOverrides(dateStr: string) {
  const { supabase, user } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const withRetry = useRetry();
  const [overrides, setOverrides] = useState<DailyOverride[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchOverrides = useCallback(async () => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setFetching(true);
    try {
      const { data, error } = await withRetry(async () =>
        supabase
          .from('daily_overrides')
          .select('schema_id, new_time, is_hidden')
          .eq('user_id', userId)
          .eq('date', dateStr)
      );

      if (error) throw error;
      setOverrides(data || []);
    } catch {
      toast.error("Błąd pobierania rutyn dnia.");
    } finally {
      setFetching(false);
    }
  }, [supabase, userId, dateStr, toast, withRetry]);

  useEffect(() => {
    fetchOverrides();
  }, [fetchOverrides]);

  const hideSchema = useCallback(
    async (schemaId: string) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
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
        const { data: existing } = await withRetry(async () =>
          supabase
            .from('daily_overrides')
            .select('id')
            .eq('user_id', userId)
            .eq('date', dateStr)
            .eq('schema_id', schemaId)
            .maybeSingle()
        );

        const { error } = existing
          ? await withRetry(async () =>
              supabase.from('daily_overrides').update({ is_hidden: true }).eq('id', existing.id)
            )
          : await withRetry(async () =>
              supabase.from('daily_overrides').insert({
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
    [supabase, userId, dateStr, overrides, toast, withRetry]
  );

  const moveSchema = useCallback(
    async (schemaId: string, newTime: string) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }

      setLoading(true);
      const previous = overrides;
      setOverrides((prev) => {
        const existing = prev.find((o) => o.schema_id === schemaId);
        if (existing) {
          return prev.map((o) =>
            o.schema_id === schemaId ? { ...o, new_time: newTime, is_hidden: false } : o
          );
        }
        return [...prev, { schema_id: schemaId, new_time: newTime, is_hidden: false }];
      });

      try {
        const { data: existing } = await withRetry(async () =>
          supabase
            .from('daily_overrides')
            .select('id')
            .eq('user_id', userId)
            .eq('date', dateStr)
            .eq('schema_id', schemaId)
            .maybeSingle()
        );

        const { error } = existing
          ? await withRetry(async () =>
              supabase
                .from('daily_overrides')
                .update({ new_time: newTime, is_hidden: false })
                .eq('id', existing.id)
            )
          : await withRetry(async () =>
              supabase.from('daily_overrides').insert({
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
    [supabase, userId, dateStr, overrides, toast, withRetry]
  );

  return { overrides, loading, fetching, hideSchema, moveSchema, fetchOverrides };
}
