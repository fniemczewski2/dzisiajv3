import { useEffect, useState, useCallback, useRef } from "react";
import { ShoppingList } from "../types";
import { useAuth } from "../providers/AuthProvider";
import { resolveSharedEmails, getUserIdByEmail } from "../utils/share";

const MAX_LISTS = 5;

export function useShoppingLists() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  const userEmailsRef = useRef<Record<string, string>>({});

  const fetchShoppingLists = useCallback(async () => {
    if (!userId) return;
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("shopping_lists")
        .select("*")
        .or(`user_id.eq.${userId},shared_with_id.eq.${userId}`)
        .limit(MAX_LISTS);

      if (error) throw error;

      const fetchedLists = (data || []) as ShoppingList[];

      const listsWithDisplayInfo = await resolveSharedEmails(
        fetchedLists,
        userId,
        supabase,
        userEmailsRef
      );

      setLists(listsWithDisplayInfo as ShoppingList[]);
    } finally {
      setFetching(false);
    }
  }, [userId, supabase]);

  const addShoppingList = useCallback(
    async (name: string, shared_with_email: string | null): Promise<boolean> => {
      setLoading(true);
      if (lists.length >= MAX_LISTS) return false;

      let sharedWithUuid: string | null = null;
      if (shared_with_email !== undefined && shared_with_email !== null) {
        sharedWithUuid = await getUserIdByEmail(shared_with_email, supabase);
      }
      
      try {
        const { error } = await supabase
          .from("shopping_lists")
          .insert([{ name, shared_with_id: sharedWithUuid, elements: [], user_id: userId }]);

        if (error) throw error;
      } finally {
        await fetchShoppingLists();
        setLoading(false);
      }
      return true;
    },
    [lists.length, supabase, userId, fetchShoppingLists]
  );

  const editShoppingList = async (
    id: string,
    updates: Partial<ShoppingList> & { shared_with_email?: string }
  ) => {
    setLoading(true);
    const { shared_with_email, display_share_info, ...finalUpdates } = updates as any;

    if (shared_with_email !== undefined) {
      finalUpdates.shared_with_id = await getUserIdByEmail(shared_with_email, supabase);
    }
    
    try {
      const { error } = await supabase
        .from("shopping_lists")
        .update(finalUpdates)
        .eq("id", id);

      if (error) throw error;  
    } finally {
      await fetchShoppingLists();
      setLoading(false);
    }
  };

  const deleteShoppingList = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("shopping_lists").delete().eq("id", id);
      if (error) throw error;
      setLists((prev) => prev.filter((l) => l.id !== id));
    } finally {
      await fetchShoppingLists();
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShoppingLists();
  }, [fetchShoppingLists]);

  return {
    lists,
    loading,
    fetching,
    maxLists: MAX_LISTS,
    fetchShoppingLists,
    addShoppingList,
    editShoppingList,
    deleteShoppingList,
  };
}