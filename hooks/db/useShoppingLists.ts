// hooks/db/useShoppingLists.ts

import { useQueryState } from "@/hooks/useQueryState";
import { ownedOrSharedFilter } from "@/lib/postgrestFilters";
import { NotSignedInError } from "@/lib/errors";
import { useLatestRef } from "@/hooks/useLatestRef";
import { useState, useCallback, useRef } from "react";
import { ShoppingElement, ShoppingList } from "@/types/shopping";
import { useAuth } from "@/providers/AuthProvider";
import { resolveSharedEmails, getUserIdByEmail } from "@/lib/share";
import { MAX_SHOPPING_LISTS } from "@/config/limits";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";
import { isAbortError } from "@/lib/abortUtils";

import { omit } from "@/lib/objectUtils";
function deleteQuestion(isOwner: boolean, isShared: boolean): string {
  if (!isOwner) {
    return "Czy chcesz wypisać się z tej listy? Zniknie z Twoich list, a właściciel zachowa ją u siebie.";
  }
  return isShared
    ? "Czy chcesz usunąć listę zakupów? Lista jest udostępniona – zniknie także u drugiej osoby."
    : "Czy chcesz usunąć listę zakupów?";
}

const NO_LISTS: ShoppingList[] = [];

export function useShoppingLists() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [loading, setLoading] = useState(false);

  const userEmailsRef = useRef<Record<string, string>>({});
  /** Ostatni stan pozycji potwierdzony przez bazę – do cofnięcia po błędzie. */
  const confirmedElementsRef = useRef<Record<string, ShoppingElement[]>>({});
  /** Kolejka zapisów pozycji per lista – szybkie kliknięcia zapisują się po kolei. */
  const writeQueueRef = useRef<Record<string, Promise<void>>>({});
  const { toast } = useToast();
  const withRetry = useRetry();

  const queryLists = useCallback(
    async ({ signal }: { signal: AbortSignal }): Promise<ShoppingList[]> => {
      if (!userId) throw new NotSignedInError();
      try {
        const { data, error } = await withRetry(
          () =>
            supabase
              .from("shopping_lists")
              .select("*")
              .or(ownedOrSharedFilter("user_id", "shared_with_id", userId))
              .limit(MAX_SHOPPING_LISTS)
              .abortSignal(signal),
          signal
        );
        if (error) throw error;
        const fetchedLists = (data || []) as ShoppingList[];
        const listsWithDisplayInfo = await resolveSharedEmails(fetchedLists, userId, supabase, userEmailsRef);
        confirmedElementsRef.current = Object.fromEntries(listsWithDisplayInfo.map((l) => [l.id ?? "", l.elements]));
        return listsWithDisplayInfo;
      } catch (err) {
        if (!isAbortError(err)) toast.error("Błąd pobierania list zakupów.");
        throw err;
      }
    },
    [supabase, userId, toast, withRetry]
  );
  const {
    data: lists,
    setData: setLists,
    fetching,
    refetch,
  } = useQueryState<ShoppingList[]>({
    queryKey: ["shopping-lists", userId ?? null],
    queryFn: queryLists,
    initial: NO_LISTS,
    enabled: Boolean(userId),
  });
  const listsRef = useLatestRef(lists);

  /**
   * Odświeżenie list. Szkielet wczytywania pokazujemy tylko przy pierwszym
   * wczytaniu, więc opcja `background` zostaje dla zgodności wywołań.
   */
  const fetchShoppingLists = useCallback(
    async (_options: { background?: boolean } = {}) => {
      await refetch();
    },
    [refetch]
  );

  const addShoppingList = useCallback(
    async (name: string, sharedWithEmail: string | null): Promise<boolean> => {
      if (!userId) {
        throw new NotSignedInError();
      }
      if (lists.length >= MAX_SHOPPING_LISTS) {
        toast.error(`Osiągnięto limit ${MAX_SHOPPING_LISTS} list zakupów.`);
        return false;
      }
      setLoading(true);

      try {
        let sharedWithUuid: string | null = null;
        if (sharedWithEmail) {
          sharedWithUuid = await getUserIdByEmail(sharedWithEmail, supabase);
        }

        const { error } = await withRetry(() =>
          supabase
            .from("shopping_lists")
            .insert([{ name, shared_with_id: sharedWithUuid, elements: [], user_id: userId }])
        );
        if (error) throw error;

        await fetchShoppingLists({ background: true });
        toast.success("Dodano listę zakupów");
        return true;
      } catch {
        toast.error("Błąd dodawania listy zakupów.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [lists.length, supabase, userId, fetchShoppingLists, toast, withRetry]
  );

  const editShoppingList = useCallback(
    async (id: string, updates: Partial<ShoppingList> & { shared_with_email?: string }) => {
      if (!userId) {
        throw new NotSignedInError();
      }
      setLoading(true);
      const previous = lists;
      const sharedWithEmail = updates.shared_with_email;
      const finalUpdates = omit(updates, ["shared_with_email", "display_share_info"]);
      setLists((prev) => prev.map((l) => (l.id === id ? { ...l, ...finalUpdates } : l)));

      try {
        if (sharedWithEmail !== undefined) {
          finalUpdates.shared_with_id = await getUserIdByEmail(sharedWithEmail, supabase);
        }

        const { error } = await withRetry(() => supabase.from("shopping_lists").update(finalUpdates).eq("id", id));
        if (error) throw error;

        // Nowa nazwa jest już na ekranie; odświeżamy w tle tylko przy zmianie
        // udostępnienia (opis „udostępnione dla…” liczy się po stronie bazy).
        if (sharedWithEmail !== undefined) void fetchShoppingLists({ background: true });
        toast.success("Zaktualizowano listę zakupów");
      } catch {
        setLists(previous);
        toast.error("Błąd aktualizacji listy zakupów.");
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, lists, fetchShoppingLists, toast, withRetry, setLists]
  );

  /**
   * Zmiana pozycji listy (odhaczenie, dodanie, usunięcie). Ekran zmienia się
   * od razu, zapis idzie w tle – bez przeładowania list, szkieletu,
   * blokowania przycisków i komunikatu przy każdym kliknięciu. Zmiany liczymy
   * od najnowszego stanu, a zapisy jednej listy idą po kolei, więc szybkie
   * klikanie nie gubi zmian. Przy błędzie wracamy do stanu z bazy.
   */
  const updateElements = useCallback(
    (id: string, change: (elements: ShoppingElement[]) => ShoppingElement[]) => {
      const current = listsRef.current.find((l) => l.id === id);
      if (!current) return;
      const next = change(current.elements);
      listsRef.current = listsRef.current.map((l) => (l.id === id ? { ...l, elements: next } : l));
      setLists(listsRef.current);

      const write = async () => {
        const { error } = await supabase.from("shopping_lists").update({ elements: next }).eq("id", id);
        if (error) throw error;
        confirmedElementsRef.current[id] = next;
      };
      const queued = (writeQueueRef.current[id] ?? Promise.resolve()).then(write).catch(() => {
        const confirmed = confirmedElementsRef.current[id];
        if (confirmed) {
          listsRef.current = listsRef.current.map((l) => (l.id === id ? { ...l, elements: confirmed } : l));
          setLists(listsRef.current);
        }
        toast.error("Nie udało się zapisać zmiany na liście.");
      });
      writeQueueRef.current[id] = queued;
    },
    [supabase, toast, listsRef, setLists]
  );

  const deleteOwnList = useCallback(
    async (id: string) => {
      const { data, error } = await withRetry(() =>
        supabase.from("shopping_lists").delete().eq("id", id).eq("user_id", userId).select("id")
      );
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("NO_ROWS_DELETED");
    },
    [supabase, userId, withRetry]
  );

  const leaveSharedList = useCallback(
    async (id: string) => {
      const { data, error } = await withRetry(() => supabase.rpc("leave_shared_shopping_list", { p_list_id: id }));
      if (error) throw error;
      if (data !== true) throw new Error("NOT_A_RECIPIENT");
    },
    [supabase, withRetry]
  );

  const deleteShoppingList = useCallback(
    async (id: string) => {
      if (!userId) {
        throw new NotSignedInError();
      }
      const list = lists.find((l) => l.id === id);
      const isOwner = !list || list.user_id === userId;

      const ok = await toast.confirm(deleteQuestion(isOwner, Boolean(list?.shared_with_id)));
      if (!ok) return;

      setLoading(true);
      const previous = lists;
      setLists((prev) => prev.filter((l) => l.id !== id));

      try {
        if (isOwner) {
          await deleteOwnList(id);
          toast.success("Usunięto listę zakupów");
        } else {
          await leaveSharedList(id);
          toast.success("Wypisano Cię z listy zakupów");
        }
      } catch {
        setLists(previous);
        toast.error(
          isOwner ? "Błąd usuwania listy zakupów." : "Nie udało się wypisać z listy. Odśwież listy i spróbuj ponownie."
        );
      } finally {
        setLoading(false);
      }
    },
    [userId, lists, toast, deleteOwnList, leaveSharedList, setLists]
  );

  return {
    lists,
    loading,
    fetching,
    maxLists: MAX_SHOPPING_LISTS,
    fetchShoppingLists,
    addShoppingList,
    editShoppingList,
    updateElements,
    deleteShoppingList,
  };
}
