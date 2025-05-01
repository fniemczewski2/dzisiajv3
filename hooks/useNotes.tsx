import { useState, useEffect } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Note } from "../types";
export function useNotes(userEmail: string) {
  const supabase = useSupabaseClient();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchNotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("user_name", userEmail);
    setNotes(data || []);
    setLoading(false);
  };
  useEffect(() => {
    fetchNotes();
  }, [userEmail]);
  return { notes, loading, fetchNotes };
}
