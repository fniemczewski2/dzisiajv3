// hooks/useNotes.ts
//
// Migracja na wspólną fabrykę CRUD — audyt 3.2.
//
// UWAGA PROJEKTOWA: editNote i togglePin/toggleArchive wysyłają do bazy
// RÓŻNE kształty payloadu (edit: pełny whitelist pól + nowy updated_at;
// toggle: tylko {pinned, archived}) — fabryka nie ma per-wywołanie
// `prepareUpdate`, tylko jedną globalną transformację. Dlatego payload jest
// budowany w cienkich wrapperach PRZED wywołaniem crud.patch(id, payload),
// a nie przez config `prepareUpdate` (który wymuszałby ten sam kształt na
// każdą edycję, w tym toggle). crud.patch scala payload przez `{...it,
// ...updates}` przy optymistycznej aktualizacji — dla editNote payload
// zawiera KOMPLETNIE wszystkie pola Note poza id, więc scalenie jest
// równoważne pełnemu zastąpieniu jak w oryginale.
import { useCallback } from "react";
import { Note } from "@/types/notes";
import { getAppDateTime } from "@/lib/dateUtils";
import { useCrudResource } from "./useCrudResource";

const MESSAGES = {
  fetchError: "Błąd pobierania notatek.",
  added: "Dodano notatkę",
  addError: "Błąd dodawania notatki.",
  edited: "Zaktualizowano notatkę",
  editError: "Błąd aktualizacji notatki.",
  deleted: "Usunięto notatkę",
  deleteError: "Błąd usuwania notatki.",
  confirmDelete: "Czy chcesz usunąć notatkę?",
};

export function useNotes() {
  const crud = useCrudResource<Note, Note>({
    table: "notes",
    order: { column: "updated_at", ascending: false },
    insertPosition: "start",
    prepareInsert: (note, userId) => ({
      ...note,
      user_id: userId,
      pinned: false,
      archived: false,
      updated_at: getAppDateTime().toISOString(),
    }),
    buildOptimistic: (note, tempId, userId) =>
      ({ ...note, id: tempId, user_id: userId, pinned: false, archived: false }) as Note,
    messages: MESSAGES,
  });

  const editNote = useCallback(
    async (note: Note) => {
      const { id, ...clean } = note;
      await crud.patch(id, {
        title: clean.title,
        items: clean.items,
        bg_color: clean.bg_color,
        user_id: clean.user_id,
        pinned: clean.pinned,
        archived: clean.archived,
        updated_at: getAppDateTime().toISOString(),
      }, {
        successMessage: MESSAGES.edited,
        errorMessage: MESSAGES.editError,
      });
    },
    [crud]
  );

  const togglePin = useCallback(
    async (id: string) => {
      const note = crud.items.find((n) => n.id === id);
      if (!note) return;
      const newPinned = !note.pinned;
      await crud.patch(
        id,
        { archived: false, pinned: newPinned },
        {
          successMessage: newPinned ? "Przypięto notatkę" : "Odpięto notatkę",
          errorMessage: "Błąd przypinania notatki.",
        }
      );
    },
    [crud]
  );

  const toggleArchive = useCallback(
    async (id: string) => {
      const note = crud.items.find((n) => n.id === id);
      if (!note) return;
      const newArchived = !note.archived;
      await crud.patch(
        id,
        { archived: newArchived, pinned: false },
        {
          successMessage: newArchived ? "Zarchiwizowano notatkę" : "Przywrócono notatkę",
          errorMessage: "Błąd archiwizacji notatki.",
        }
      );
    },
    [crud]
  );

  const deleteNote = useCallback(
    async (id: string): Promise<void> => {
      await crud.remove(id);
    },
    [crud]
  );

  return {
    notes: crud.items,
    loading: crud.loading,
    fetching: crud.fetching,
    fetchNotes: crud.refetch,
    addNote: crud.add,
    editNote,
    deleteNote,
    togglePin,
    toggleArchive,
  };
}
