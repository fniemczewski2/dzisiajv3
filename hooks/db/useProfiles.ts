// hooks/db/useProfiles.ts
//
// Wizytówki (vcard_profiles) – na wspólnym useCrudResource: optymistyczne
// zmiany, ponowienia i kopia offline jak w pozostałych modułach.

import { useCallback } from "react";
import { useToast } from "@/providers/ToastProvider";
import { getPostgresErrorCode } from "@/lib/errorUtils";
import { MAX_VCARD_PROFILES } from "@/config/limits";
import type { NewVCardProfile, VCardProfile } from "@/types/profiles";
import { useCrudResource } from "./useCrudResource";

type ProfileResult = { success: boolean; data?: VCardProfile; error?: string };

const SLUG_TAKEN = "Ten publiczny adres jest już zajęty.";
const LIMIT_REACHED = `Osiągnięto limit ${MAX_VCARD_PROFILES} wizytówek.`;

export function useProfiles() {
  const { toast } = useToast();
  const crud = useCrudResource<VCardProfile, NewVCardProfile>({
    table: "vcard_profiles",
    order: { column: "created_at", ascending: true },
    insertPosition: "end",
    applyServerRowOnEdit: true,
    describeError: (error) => (getPostgresErrorCode(error) === "23505" ? SLUG_TAKEN : undefined),
    messages: {
      fetchError: "Nie udało się pobrać wizytówek.",
      added: "Dodano wizytówkę.",
      addError: "Nie udało się dodać wizytówki.",
      edited: "Zapisano wizytówkę.",
      editError: "Nie udało się zapisać wizytówki.",
      deleted: "Usunięto wizytówkę.",
      deleteError: "Nie udało się usunąć wizytówki.",
      confirmDelete: "Czy chcesz usunąć wizytówkę?",
    },
  });
  const { items, add, patch, remove } = crud;

  const addProfile = useCallback(
    async (profile: NewVCardProfile): Promise<ProfileResult> => {
      if (items.length >= MAX_VCARD_PROFILES) {
        toast.error(LIMIT_REACHED);
        return { success: false, error: LIMIT_REACHED };
      }
      const data = await add(profile);
      return data ? { success: true, data } : { success: false };
    },
    [items.length, add, toast]
  );

  const updateProfile = useCallback(
    async (id: string, updates: Partial<VCardProfile>): Promise<ProfileResult> => {
      const data = await patch(id, updates);
      return data ? { success: true, data } : { success: false };
    },
    [patch]
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      await remove(id);
    },
    [remove]
  );

  return {
    profiles: items,
    fetching: crud.fetching,
    loading: crud.loading,
    refetch: crud.refetch,
    addProfile,
    updateProfile,
    deleteProfile,
  };
}
