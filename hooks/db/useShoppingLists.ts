import { useEffect, useState, useCallback, useRef } from "react";
import { ShoppingList } from "@/types/shopping";
import { useAuth } from "@/providers/AuthProvider";
import { resolveSharedEmails, getUserIdByEmail } from "@/lib/share";
import { MAX_SHOPPING_LISTS } from "@/config/limits";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";

export function useShoppingLists() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  const userEmailsRef = useRef<Record<string, string>>({});
  const { toast } = useToast();
  const withRetry = useRetry();

  const fetchShoppingLists = useCallback(async () => {
    if (!userId) {

      throw new Error("Unauthorized");
    }
    setFetching(true);
    try {
      const { data, error } = await withRetry(async () =>
        supabase
          .from("shopping_lists")
          .select("*")
          .or(`user_id.eq.${userId},shared_with_id.eq.${userId}`)
          .limit(MAX_SHOPPING_LISTS)
      );

      if (error) throw error;

      const fetchedLists = (data || []) as ShoppingList[];
      const listsWithDisplayInfo = await resolveSharedEmails(fetchedLists, userId, supabase, userEmailsRef);
      setLists(listsWithDisplayInfo);
    } catch {
      toast.error("Błąd pobierania list zakupów.");
    } finally {
      setFetching(false);
    }
  }, [userId, supabase, toast, withRetry]);

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
        if (sharedWithEmail !== undefined && sharedWithEmail !== null) {
          sharedWithUuid = await getUserIdByEmail(sharedWithEmail, supabase);
        }

        const { error } = await withRetry(async () =>
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
      const { shared_with_email: sharedWithEmail, display_share_info: _displayShareInfo, ...finalUpdates } =
        updates;
      setLists((prev) => prev.map((l) => (l.id === id ? { ...l, ...finalUpdates } : l)));

      try {
        if (sharedWithEmail !== undefined) {
          finalUpdates.shared_with_id = await getUserIdByEmail(sharedWithEmail, supabase);
        }

        const { error } = await withRetry(async () =>
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

  const deleteShoppingList = useCallback(
    async (id: string) => {
      if (!userId) {
  
        throw new Error("Unauthorized");
      }
      const ok = await toast.confirm(`Czy chcesz usunąć listę zakupów?`);
      if (!ok) return;
      setLoading(true);
      const previous = lists;
      setLists((prev) => prev.filter((l) => l.id !== id));

      try {
        const { error } = await withRetry(async () => supabase.from("shopping_lists").delete().eq("id", id));
        if (error) throw error;
        toast.success("Usunięto listę zakupów");
      } catch {
        setLists(previous);
        toast.error("Błąd usuwania listy zakupów.");
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, lists, toast, withRetry]
  );

  useEffect(() => {
    fetchShoppingLists();
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
