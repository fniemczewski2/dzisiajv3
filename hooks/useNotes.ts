// hooks/useNotes.ts
import { useState, useEffect } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Note } from "../types";

export function useNotes() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const userEmail = session?.user?.email || "";
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = async () => {
    if (!userEmail) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_name", userEmail);
    setNotes(data || []);
    setLoading(false);
  };

  const addNote = async (note: Note) => {
    if (!userEmail) return;
    setLoading(true);
    const { data } = await supabase
      .from("notes")
      .insert({ user_name: userEmail, note })
      .select()
      .single();
    setNotes((prev) => [...prev, data]);
    setLoading(false);
  };

  const editNote = async (note: Note) => {
    if (!userEmail) return;
    setLoading(true);

    const { id, ...clean } = note;  // remove id from update body

    const { data, error } = await supabase
      .from("notes")
      .update({
        title: clean.title,
        items: clean.items,
        bg_color: clean.bg_color,
        user_name: clean.user_name
      })
      .eq("id", id)
      .select()
      .single();

    if (error) console.error(error);

    setNotes((prev) => prev.map((n) => (n.id === id ? data : n)));
    setLoading(false);
  };

  const deleteNote = async (id: string) => {
    if (!userEmail) return;
    setLoading(true);
    await supabase.from("notes").delete().eq("id", id);
    await fetchNotes();
    setLoading(false);
  }

  useEffect(() => {
    fetchNotes();
  }, [userEmail]);

  return { notes, loading, fetchNotes, addNote, editNote, deleteNote };
}
