// hooks/useDaySchemas.ts

import { useCallback } from "react";
import { Schema, ScheduleItem } from "@/types/schemas";
import { useCrudResource } from "./useCrudResource";

type SchemaRow = Schema & { id: string };

function parseSchema(raw: { days: string | number[]; entries: string | ScheduleItem[] }): SchemaRow {
  return {
    ...raw,
    days: typeof raw.days === "string" ? JSON.parse(raw.days) : raw.days,
    entries: typeof raw.entries === "string" ? JSON.parse(raw.entries) : raw.entries,
  } as SchemaRow;
}

const MESSAGES = {
  fetchError: "Błąd pobierania schematów.",
  added: "Dodano schemat",
  addError: "Błąd dodawania schematu.",
  edited: "Zaktualizowano schemat",
  editError: "Błąd aktualizacji schematu.",
  deleted: "Usunięto schemat",
  deleteError: "Błąd usuwania schematu.",
  confirmDelete: "Czy chcesz usunąć schemat?",
};

export function useDaySchemas() {
  const crud = useCrudResource<SchemaRow, Schema>({
    table: "day_schemas",
    transformRow: (row) => parseSchema(row as { days: string | number[]; entries: string | ScheduleItem[] }),
    prepareInsert: (payload, userId) => ({
      user_id: userId,
      name: payload.name,
      days: payload.days,
      entries: payload.entries,
    }),
    buildOptimistic: (payload, tempId) => ({ ...payload, id: tempId }) as SchemaRow,
    prepareUpdate: (updates) => ({ name: updates.name, days: updates.days, entries: updates.entries }),
    messages: MESSAGES,
  });

  const deleteSchema = useCallback(
    async (id: string): Promise<void> => {
      await crud.remove(id);
    },
    [crud]
  );

  return {
    schemas: crud.items,
    loading: crud.loading,
    fetching: crud.fetching,
    fetchSchemas: crud.refetch,
    addSchema: crud.add,
    updateSchema: crud.patch,
    deleteSchema,
  };
}
