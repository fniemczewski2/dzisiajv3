// hooks/db/useReports.ts

import { useCallback } from "react";
import { Report } from "@/types/reports";
import { useCrudResource } from "./useCrudResource";

type ReportInsert = Omit<Report, "id" | "inserted_at" | "updated_at">;

const MESSAGES = {
  fetchError: "Błąd pobierania raportów.",
  added: "Dodano raport",
  addError: "Błąd dodawania raportu.",
  edited: "Zaktualizowano raport",
  editError: "Błąd aktualizacji raportu.",
  deleted: "Usunięto raport",
  deleteError: "Błąd usuwania raportu.",
  confirmDelete: "Czy chcesz usunąć raport?",
};

export function useReports() {
  const crud = useCrudResource<Report, ReportInsert>({
    table: "reports",
    order: { column: "date", ascending: false },
    insertPosition: "start",
    applyServerRowOnEdit: true, 
    messages: MESSAGES,
  });

  const deleteReport = useCallback(
    async (id: string): Promise<void> => {
      await crud.remove(id);
    },
    [crud]
  );

  return {
    reports: crud.items,
    loading: crud.loading,
    fetching: crud.fetching,
    fetchReports: crud.refetch,
    addReport: crud.add,
    editReport: crud.patch,
    deleteReport,
  };
}
