// hooks/useReminders.ts

import { useState, useCallback, useMemo } from "react";
import { Reminder } from "@/types/reminders";
import { getAppDate, getAppDateTime } from "@/lib/dateUtils";
import { useCrudResource } from "./useCrudResource";

type ReminderInsert = Omit<Reminder, "id" | "user_id">;

const MESSAGES = {
  fetchError: "Błąd pobierania zadań cyklicznych.",
  added: "Dodano zadanie cykliczne",
  addError: "Błąd dodawania zadania cyklicznego.",
  edited: "Zaktualizowano zadanie cykliczne",
  editError: "Błąd aktualizacji zadania cyklicznego.",
  deleted: "Usunięto zadanie cykliczne",
  deleteError: "Błąd usuwania zadania cyklicznego.",
  confirmDelete: "Czy chcesz usunąć zadanie cykliczne?",
};

export function useReminders() {
  const [today] = useState(() => getAppDate());

  const crud = useCrudResource<Reminder, ReminderInsert>({
    table: "reminders",
    order: { column: "data_poczatkowa", ascending: true },
    applyServerRowOnEdit: true,
    messages: MESSAGES,
  });

  const addReminder = useCallback(
    async (tytul: string, dataPoczatkowa: string, powtarzanie: number) =>
      crud.add({ tytul, data_poczatkowa: dataPoczatkowa, powtarzanie, done: null }),
    [crud]
  );

  const postponeReminder = useCallback(
    async (id: string, powtarzanie: number) => {
      const dt = getAppDateTime();
      dt.setDate(dt.getDate() + 1 - powtarzanie);
      const done = dt.toISOString().slice(0, 10);
      await crud.patch(id, { done }, {
        successMessage: "Przełożono zadanie cykliczne",
        errorMessage: "Błąd przekładania zadania cyklicznego.",
      });
    },
    [crud]
  );

  const completeReminder = useCallback(
    async (id: string) => {
      await crud.patch(id, { done: today }, {
        successMessage: "Wykonano zadanie cykliczne",
        errorMessage: "Błąd wykonania zadania cyklicznego.",
      });
    },
    [crud, today]
  );

  const deleteReminder = useCallback(
    async (id: string): Promise<void> => {
      await crud.remove(id);
    },
    [crud]
  );

  const visibleReminders = useMemo(() => {
    return crud.items.filter((r) => {
      if (r.data_poczatkowa > today) return false;
      if (!r.done) return true;
      const nextDue = new Date(r.done);
      nextDue.setDate(nextDue.getDate() + r.powtarzanie);
      return today >= nextDue.toISOString().slice(0, 10);
    });
  }, [crud.items, today]);

  return {
    allReminders: crud.items,
    visibleReminders,
    addReminder,
    completeReminder,
    postponeReminder,
    deleteReminder,
    fetchReminders: crud.refetch,
    fetching: crud.fetching,
    loading: crud.loading,
  };
}
