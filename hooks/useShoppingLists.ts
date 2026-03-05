import { useEffect, useState } from "react";
import { ShoppingList } from "../types";
import { useAuth } from "../providers/AuthProvider";

export function useShoppingLists() {
  const { user, supabase } = useAuth(); 
  const userId = user?.id;
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(false);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});

  const fetchShoppingLists = async () => {
    if (!userId) return; 
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("shopping_lists")
        .select("*")
        .or(`user_id.eq.${userId},shared_with_id.eq.${userId}`)
        .limit(5);

      if (error) throw error;
      
      const fetchedLists = data || [];

      // Poprawka TS: Type Guard "id is string" pozwala uniknąć błędów
      const neededIds = Array.from(new Set(
        fetchedLists
          .map((l: ShoppingList) => l.user_id === userId ? l.shared_with_id : l.user_id)
          .filter((id: string) => Boolean(id) && id !== userId && !userEmails[id as string])
      ));


      let currentEmails = { ...userEmails };

      if (neededIds.length > 0) {
        const { data: emailData } = await supabase.rpc('get_emails_by_ids', { user_ids: neededIds });
        if (emailData) {
          const newEmails = (emailData as {id: string, email: string}[]).reduce((acc, curr) => {
            acc[curr.id] = curr.email;
            return acc;
          }, {} as Record<string, string>);
          
          // Zasilamy zarówno lokalną kopię na teraz, jak i React State na później
          currentEmails = { ...currentEmails, ...newEmails };
          setUserEmails(currentEmails);
        }
      }

      const listsWithDisplayInfo = fetchedLists.map((list: ShoppingList) => {
        const isOwner = list.user_id === userId;
        const targetId = isOwner ? list.shared_with_id : list.user_id;
        
        // Używamy currentEmails, a nie userEmails!
        const email = targetId ? (currentEmails[targetId] || "...") : "";

        return {
          ...list,
          display_share_info: isOwner
            ? (list.shared_with_id ? `Udostępniono: ${email}` : null)
            : `Od: ${email}`
        };
      });

      setLists(listsWithDisplayInfo as ShoppingList[]);
    } catch (error) {
       console.error("Error fetching shopping lists:", error);
    } finally {
      setLoading(false);
    }
  };

  const addShoppingList = async (name: string, shared_with_email: string | null) => {
    if (lists.length >= 5) return alert("Maksymalnie 5 list.");
    
    let sharedWithUuid = null;

    if (shared_with_email && shared_with_email.includes('@')) {
      const { data: foundId } = await supabase.rpc('get_user_id_by_email', { 
        email_address: shared_with_email.trim().toLowerCase() 
      });
      sharedWithUuid = foundId || null;
    }

    const { error } = await supabase
      .from("shopping_lists")
      .insert([{ 
        name, 
        shared_with_id: sharedWithUuid, 
        elements: [], 
        user_id: userId 
      }]);

    if (!error) {
      await fetchShoppingLists();
    }
  };

  const editShoppingList = async (id: string, updates: Partial<ShoppingList> & { shared_with_email?: string }) => {
    const { shared_with_email, display_share_info, ...finalUpdates } = updates as any;
    if (shared_with_email !== undefined) {
      if (shared_with_email && shared_with_email.includes('@')) {
        const { data: foundId } = await supabase.rpc('get_user_id_by_email', { 
          email_address: shared_with_email.trim().toLowerCase() 
        });
        finalUpdates.shared_with_id = foundId || null;
      } else {
        // Jeśli przekazano pusty string ("" lub "null" jako tekst), zerujemy powiązanie w bazie
        finalUpdates.shared_with_id = null;
      }
    }

    const { error } = await supabase
      .from("shopping_lists")
      .update(finalUpdates)
      .eq("id", id);

    if (!error) {
       await fetchShoppingLists();
    }
  };

  const deleteShoppingList = async (id: string) => {
    await supabase.from("shopping_lists").delete().eq("id", id);
    setLists(lists.filter((l) => l.id !== id));
  };

  useEffect(() => {
    fetchShoppingLists();
  }, [userId]);

  return { lists, loading, addShoppingList, fetchShoppingLists, editShoppingList, deleteShoppingList };
}