import { useCallback } from 'react';
import { WorkLog, WorkLogInsert } from '@/types/worklogs';
import { useCrudResource } from './useCrudResource';

// hooks/db/useWorkLogs.ts

const MESSAGES = {
  fetchError: 'Błąd pobierania czasu pracy.',
  added: 'Dodano czas pracy.',
  addError: 'Błąd dodawania czasu pracy.',
  edited: 'Zaktualizowano czas pracy.',
  editError: 'Błąd aktualizacji czasu pracy.',
  deleted: 'Usunięto czas pracy.',
  deleteError: 'Błąd usuwania czasu pracy.',
  confirmDelete: 'Czy chcesz usunąć czas pracy?',
};

export function useWorkLogs(dateStr?: string, monthStr?: string) {
  const crud = useCrudResource<WorkLog, Omit<WorkLogInsert, 'user_id'>>({
    table: 'work_logs',
    queryKey: `${dateStr ?? ''}:${monthStr ?? ''}`,
    buildQuery: (q, userId) => {
      let query = q.eq('user_id', userId).order('start_time', { ascending: true });

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
    },
    messages: MESSAGES,
  });

  const deleteWorkLog = useCallback(
    async (id: string): Promise<void> => {
      await crud.remove(id);
    },
    [crud]
  );

  return {
    workLogs: crud.items,
    loading: crud.loading,
    fetching: crud.fetching,
    fetchWorkLogs: crud.refetch,
    addWorkLog: crud.add,
    deleteWorkLog,
  };
}
