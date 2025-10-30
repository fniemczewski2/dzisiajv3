import { useEffect, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { ShoppingList, ShoppingElement } from "../types";

export function useShoppingLists(userEmail: string) {
  const supabase = useSupabaseClient();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLists = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shopping_lists")
      .select("*")
      .or(`user_email.eq.${userEmail},share.eq.${userEmail}`) 
      .limit(5);

    if (!error && data) {
      setLists(data as ShoppingList[]);
    }
    setLoading(false);
  };


  const addList = async (name: string, share: string | null) => {
    if (lists.length >= 5) {
      alert("Możesz mieć maksymalnie 5 list.");
      return;
    }
    const { data, error } = await supabase
      .from("shopping_lists")
      .insert([{ name, share, elements: [], user_email: userEmail }])
      .select()
      .single();
    if (!error && data) setLists([...lists, data as ShoppingList]);
  };

  const updateList = async (id: string, updates: Partial<ShoppingList>) => {
    const { data, error } = await supabase
      .from("shopping_lists")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (!error && data) {
      setLists(lists.map((l) => (l.id === id ? (data as ShoppingList) : l)));
    }
  };

  const deleteList = async (id: string) => {
    await supabase.from("shopping_lists").delete().eq("id", id);
    setLists(lists.filter((l) => l.id !== id));
  };

  useEffect(() => {
    fetchLists();
  }, [userEmail]);

  return { lists, loading, addList, fetchLists,updateList, deleteList };
}
