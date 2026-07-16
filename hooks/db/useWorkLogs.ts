import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { WorkLog, WorkLogInsert } from '@/types/worklogs';
import { useToast } from '@/providers/ToastProvider';
import { useRetry } from '@/hooks/useRetry';

export function useWorkLogs(dateStr?: string, monthStr?: string) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const withRetry = useRetry();

  const fetchWorkLogs = useCallback(async () => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setFetching(true);

    try {
      const { data, error } = await withRetry(async () => {
        let query = supabase
          .from('work_logs')
          .select('*')
          .eq('user_id', userId)
          .order('start_time', { ascending: true });

        if (dateStr) {
          query = query.gte('start_time', `${dateStr}T00:00:00.000Z`).lte('start_time', `${dateStr}T23:59:59.999Z`);
        }

        if (monthStr) {
          const [year, month] = monthStr.split('-');
          const startDate = new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1);
          const endDate = new Date(Number.parseInt(year), Number.parseInt(month), 0, 23, 59, 59, 999);
          query = query.gte('start_time', startDate.toISOString()).lte('start_time', endDate.toISOString());
        }

        return query;
      });

      if (error) throw error;
      setWorkLogs(data || []);
    } catch {
      toast.error('Błąd pobierania czasu pracy.');
    } finally {
      setFetching(false);
    }
  }, [userId, supabase, dateStr, monthStr, toast, withRetry]);

  useEffect(() => {
    fetchWorkLogs();
  }, [fetchWorkLogs]);

  const addWorkLog = useCallback(
    async (log: Omit<WorkLogInsert, 'user_id'>) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const tempId = `temp-${Date.now()}`;
      const optimisticLog = { ...log, id: tempId, user_id: userId } as WorkLog;
      setWorkLogs((prev) => [...prev, optimisticLog]);

      try {
        const { data, error } = await withRetry(async () =>
          supabase.from('work_logs').insert([{ ...log, user_id: userId }]).select().single()
        );
        if (error) throw error;

        setWorkLogs((prev) => prev.map((l) => (l.id === tempId ? (data as WorkLog) : l)));
        toast.success('Dodano czas pracy.');
        return { data };
      } catch {
        setWorkLogs((prev) => prev.filter((l) => l.id !== tempId));
        toast.error('Błąd dodawania czasu pracy.');
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, toast, withRetry]
  );

  const deleteWorkLog = useCallback(
    async (id: string) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      const ok = await toast.confirm(`Czy chcesz usunąć czas pracy?`);
      if (!ok) return;
      setLoading(true);
      const previous = workLogs;
      setWorkLogs((prev) => prev.filter((log) => log.id !== id));

      try {
        const { error } = await withRetry(async () => supabase.from('work_logs').delete().eq('id', id));
        if (error) throw error;
        toast.success('Usunięto czas pracy.');
      } catch {
        setWorkLogs(previous);
        toast.error('Błąd usuwania czasu pracy.');
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, workLogs, toast, withRetry]
  );

  return {
    workLogs,
    loading,
    fetching,
    fetchWorkLogs,
    addWorkLog,
    deleteWorkLog,
  };
}
