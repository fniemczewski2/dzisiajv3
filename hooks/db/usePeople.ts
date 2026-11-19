// hooks/db/usePeople.ts

import { useNow } from "@/hooks/useNow";
import { useCallback, useMemo } from "react";
import { Person, PersonInsert } from "@/types/people";
import { useCrudResource } from "./useCrudResource";
import { isContactOverdue } from "@/shared/contacts";

const MESSAGES = {
  fetchError: "Błąd pobierania kontaktów.",
  added: "Dodano kontakt",
  addError: "Błąd dodawania kontaktu.",
  edited: "Zaktualizowano kontakt",
  editError: "Błąd aktualizacji kontaktu.",
  deleted: "Usunięto kontakt",
  deleteError: "Błąd usuwania kontaktu.",
  confirmDelete: "Czy na pewno chcesz usunąć kontakt?",
};

export function usePeople() {
  const crud = useCrudResource<Person, PersonInsert>({
    table: "people",
    order: { column: "first_name", ascending: true },
    messages: MESSAGES,
  });

  const people = useMemo(() => [...crud.items].sort((a, b) => a.first_name.localeCompare(b.first_name)), [crud.items]);

  const deletePerson = useCallback(
    async (id: string): Promise<void> => {
      await crud.remove(id);
    },
    [crud]
  );

  const logContact = useCallback(
    async (id: string) => {
      await crud.patch(id, { last_contact_date: new Date().toISOString() });
    },
    [crud]
  );

  const now = useNow();

  const getPeopleToContact = useMemo(
    () => people.filter((p) => isContactOverdue(p.priority, p.last_contact_date, now)),
    [people, now]
  );

  return {
    people,
    loading: crud.loading,
    fetching: crud.fetching,
    addPerson: crud.add,
    editPerson: crud.patch,
    deletePerson,
    logContact,
    getPeopleToContact,
    fetchPeople: crud.refetch,
  };
}
