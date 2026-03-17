// hooks/useShoppingLists.ts

import { useEffect, useState, useCallback, useRef } from "react";
import { ShoppingList } from "../types";
import { useAuth } from "../providers/AuthProvider";

const MAX_LISTS = 5;

export function useShoppingLists() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(false);

  const userEmailsRef = useRef<Record<string, string>>({});

  const fetchShoppingLists = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("shopping_lists")
        .select("*")
        .or(`user_id.eq.${userId},shared_with_id.eq.${userId}`)
        .limit(MAX_LISTS);

      if (error) throw error;

      const fetchedLists = (data || []) as ShoppingList[];

      const neededIds = Array.from(
        new Set(
          fetchedLists
            .map((l) => (l.user_id === userId ? l.shared_with_id : l.user_id))
            .filter((id): id is string =>
              typeof id === "string" && id !== userId && !userEmailsRef.current[id]
            )
        )
      );

      if (neededIds.length > 0) {
        const { data: emailData } = await supabase.rpc("get_emails_by_ids", {
          user_ids: neededIds,
        });
        if (emailData) {
          const newEmails = (emailData as { id: string; email: string }[]).reduce<
            Record<string, string>
          >((acc, curr) => { acc[curr.id] = curr.email; return acc; }, {});

          userEmailsRef.current = { ...userEmailsRef.current, ...newEmails };
        }
      }

      const currentEmails = userEmailsRef.current;

      setLists(
        fetchedLists.map((list) => {
          const isOwner = list.user_id === userId;
          const targetId = isOwner ? list.shared_with_id : list.user_id;
          const email = targetId ? (currentEmails[targetId] ?? "...") : "";
          return {
            ...list,
            display_share_info: isOwner
              ? list.shared_with_id ? `Udostępniono: ${email}` : null
              : `Od: ${email}`,
          };
        }) as ShoppingList[]
      );
    } finally {
      setLoading(false);
    }

  }, [userId, supabase]);

  const addShoppingList = useCallback(
    async (name: string, shared_with_email: string | null): Promise<boolean> => {
      if (lists.length >= MAX_LISTS) return false;

      let sharedWithUuid: string | null = null;
      if (shared_with_email?.includes("@")) {
        const { data: foundId } = await supabase.rpc("get_user_id_by_email", {
          email_address: shared_with_email.trim().toLowerCase(),
        });
        sharedWithUuid = foundId || null;
      }

      const { error } = await supabase
        .from("shopping_lists")
        .insert([{ name, shared_with_id: sharedWithUuid, elements: [], user_id: userId }]);

      if (error) throw error;
      await fetchShoppingLists();
      return true;
    },
    [lists.length, supabase, userId, fetchShoppingLists]
  );

  const editShoppingList = async (
    id: string,
    updates: Partial<ShoppingList> & { shared_with_email?: string }
  ) => {
    const { shared_with_email, display_share_info, ...finalUpdates } = updates as any;

    if (shared_with_email !== undefined) {
      if (shared_with_email?.includes("@")) {
        const { data: foundId } = await supabase.rpc("get_user_id_by_email", {
          email_address: shared_with_email.trim().toLowerCase(),
        });
        finalUpdates.shared_with_id = foundId || null;
      } else {
        finalUpdates.shared_with_id = null;
      }
    }

    const { error } = await supabase
      .from("shopping_lists")
      .update(finalUpdates)
      .eq("id", id);

    if (error) throw error;
    await fetchShoppingLists();
  };

  const deleteShoppingList = async (id: string) => {
    const { error } = await supabase.from("shopping_lists").delete().eq("id", id);
    if (error) throw error;
    setLists((prev) => prev.filter((l) => l.id !== id));
  };

  useEffect(() => {
    fetchShoppingLists();
  }, [fetchShoppingLists]);

  return {
    lists,
    loading,
    maxLists: MAX_LISTS,
    fetchShoppingLists,
    addShoppingList,
    editShoppingList,
    deleteShoppingList,
  };
}