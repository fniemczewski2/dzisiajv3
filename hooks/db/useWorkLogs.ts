import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { WorkLog, WorkLogInsert } from '@/types';
import { useToast } from '@/providers/ToastProvider';

export function useWorkLogs(dateStr?: string, monthStr?: string) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  useEffect(() => {
    let toastId: string | undefined;
    if (fetching  && toast.loading) toastId = toast.loading("Ładowanie logów...");
    return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [fetching, toast]);


  const fetchWorkLogs = useCallback(async () => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setFetching(true);

    try {
      let query = supabase
        .from('work_logs')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: true });

      if (dateStr) {
        const startOfDay = `${dateStr}T00:00:00.000Z`;
        const endOfDay = `${dateStr}T23:59:59.999Z`;
        query = query.gte('start_time', startOfDay).lte('start_time', endOfDay);
      }

      if (monthStr) {
        const [year, month] = monthStr.split('-');
        const startDate = new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1);
        const endDate = new Date(Number.parseInt(year), Number.parseInt(month), 0, 23, 59, 59, 999);
        
        query = query
          .gte('start_time', startDate.toISOString())
          .lte('start_time', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setWorkLogs(data || []);
    } catch {
      console.error('Błąd pobierania czasu pracy.');
    } finally {
      setFetching(false);
    }
  }, [user, dateStr, monthStr]);

  useEffect(() => {
    fetchWorkLogs();
  }, [fetchWorkLogs]);

  const addWorkLog = async (log: Omit<WorkLogInsert, 'user_id'>) => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }

    setLoading(true);

    try {
      const { data } = await supabase
        .from('work_logs')
        .insert([{ ...log, user_id: userId }])
        .select()
        .single();
      
      setWorkLogs((prev) => [...prev, data]);
      toast.success('Dodano czas pracy.');
      return { data };
    } catch {
      toast.error('Błąd dodawania czasu pracy.');
      return;
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkLog = async (id: string) => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    const ok = await toast.confirm(
      `Czy chcesz usunąć czas pracy?`
    );
    if (!ok) return;
    setLoading(true);
    try {
      await supabase
        .from('work_logs')
        .delete()
        .eq('id', id);
      
      setWorkLogs((prev) => prev.filter((log) => log.id !== id));
      toast.success('Usunięto czas pracy.');
      return;
    } catch {
      toast.error('Błąd usuwania czasu pracy.');
      return;
    } finally {
      setLoading(false);
    } 
  };

  return {
    workLogs,
    loading,
    fetching,
    fetchWorkLogs,
    addWorkLog,
    deleteWorkLog,
  };
}