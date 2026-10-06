// hooks/db/useShoppingLists.ts

import { useEffect, useState, useCallback, useRef } from "react";
import { ShoppingList } from "@/types/shopping";
import { useAuth } from "@/providers/AuthProvider";
import { resolveSharedEmails, getUserIdByEmail } from "@/lib/share";
import { MAX_SHOPPING_LISTS } from "@/config/limits";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";
import { useAbortController } from "@/hooks/useAbortController";
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

export function useShoppingLists() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  const userEmailsRef = useRef<Record<string, string>>({});
  const { toast } = useToast();
  const withRetry = useRetry();
  const { getSignal } = useAbortController();

  const fetchShoppingLists = useCallback(async () => {
    if (!userId) {

      throw new Error("Unauthorized");
    }
    const signal = getSignal();
    setFetching(true);
    try {
      const { data, error } = await withRetry(
        () =>
          supabase
            .from("shopping_lists")
            .select("*")
            .or(`user_id.eq.${userId},shared_with_id.eq.${userId}`)
            .limit(MAX_SHOPPING_LISTS)
            .abortSignal(signal),
        signal
      );

      if (error) throw error;

      const fetchedLists = (data || []) as ShoppingList[];
      const listsWithDisplayInfo = await resolveSharedEmails(fetchedLists, userId, supabase, userEmailsRef);
      if (!signal.aborted) setLists(listsWithDisplayInfo);
    } catch (err) {
      if (isAbortError(err)) return;
      toast.error("Błąd pobierania list zakupów.");
    } finally {
      if (!signal.aborted) setFetching(false);
    }
  }, [userId, supabase, toast, withRetry, getSignal]);

  const addShoppingList = useCallback(
    async (name: string, sharedWithEmail: string | null): Promise<boolean> => {
      if (!userId) {
  
        throw new Error("Unauthorized");
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

        await fetchShoppingLists();
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
  
        throw new Error("Unauthorized");
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

        const { error } = await withRetry(() =>
          supabase.from("shopping_lists").update(finalUpdates).eq("id", id)
        );
        if (error) throw error;

        await fetchShoppingLists();
        toast.success("Zaktualizowano listę zakupów");
      } catch {
        setLists(previous);
        toast.error("Błąd aktualizacji listy zakupów.");
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, lists, fetchShoppingLists, toast, withRetry]
  );

  /**
   * „Usuń” działa zależnie od roli:
   *  - właściciel kasuje listę (także u osoby, której ją udostępnił);
   *  - odbiorca tylko się wypisuje – lista znika u niego, a właściciel
   *    zachowuje ją jako nieudostępnioną.
   * Wypisanie idzie przez RPC leave_shared_shopping_list: zwykły UPDATE
   * z JWT odbiorcy jest blokowany przez RLS, bo po zmianie przestałby on
   * widzieć wiersz. Polityka DELETE pozwala usuwać wyłącznie właścicielowi.
   */
  const deleteOwnList = useCallback(
    async (id: string) => {
      const { data, error } = await withRetry(() =>
        supabase.from("shopping_lists").delete().eq("id", id).eq("user_id", userId).select("id")
      );
      if (error) throw error;
      // RLS nie zwraca błędu, tylko 0 usuniętych wierszy.
      if (!data || data.length === 0) throw new Error("NO_ROWS_DELETED");
    },
    [supabase, userId, withRetry]
  );

  const leaveSharedList = useCallback(
    async (id: string) => {
      const { data, error } = await withRetry(() =>
        supabase.rpc("leave_shared_shopping_list", { p_list_id: id })
      );
      if (error) throw error;
      // false = nie byłeś już odbiorcą tej listy (np. właściciel zdjął udostępnienie).
      if (data !== true) throw new Error("NOT_A_RECIPIENT");
    },
    [supabase, withRetry]
  );

  const deleteShoppingList = useCallback(
    async (id: string) => {
      if (!userId) {
        throw new Error("Unauthorized");
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
          isOwner
            ? "Błąd usuwania listy zakupów."
            : "Nie udało się wypisać z listy. Odśwież listy i spróbuj ponownie."
        );
      } finally {
        setLoading(false);
      }
    },
    [userId, lists, toast, deleteOwnList, leaveSharedList]
  );

  useEffect(() => {
    void fetchShoppingLists();
  }, [fetchShoppingLists]);

  return {
    lists,
    loading,
    fetching,
    maxLists: MAX_SHOPPING_LISTS,
    fetchShoppingLists,
    addShoppingList,
    editShoppingList,
    deleteShoppingList,
  };
}
