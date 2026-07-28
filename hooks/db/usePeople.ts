// hooks/usePeople.ts
//
// Migracja na wspólną fabrykę CRUD — audyt 3.2. Sortowanie alfabetyczne
// (wcześniej wymuszane ręcznie przy każdym insert/update wewnątrz setState)
// przeniesione do warstwy prezentacji jako useMemo — ten sam efekt końcowy,
// bez sprzęgania fabryki z regułą sortowania specyficzną dla tej domeny.
import { useCallback, useMemo } from "react";
import { Person, PersonInsert } from "@/types/people";
import { useCrudResource } from "./useCrudResource";

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

  const people = useMemo(
    () => [...crud.items].sort((a, b) => a.first_name.localeCompare(b.first_name)),
    [crud.items]
  );

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

  const getPeopleToContact = useMemo(() => {
    const now = new Date();
    return people.filter((p) => {
      if (p.priority === 0 || p.priority === 5) return false;
      if (!p.last_contact_date) return true;
      const lastContact = new Date(p.last_contact_date);
      const diffDays = Math.ceil(Math.abs(now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
      switch (p.priority) {
        case 1: return diffDays >= 14;
        case 2: return diffDays >= 30;
        case 3: return diffDays >= 61;
        case 4: return diffDays >= 365;
        default: return false;
      }
    });
  }, [people]);

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
