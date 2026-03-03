import { useState, useEffect } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Note } from "../types";
import { getAppDateTime } from "../lib/dateUtils";

export function useNotes() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const userId = session?.user?.id;
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId);
    
    const sorted = (data || []).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (a.archived && !b.archived) return 1;
      if (!a.archived && b.archived) return -1;

      const dateA = new Date(a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.updated_at || b.created_at).getTime();
      return dateB - dateA;
    });
    
    setNotes(sorted);
    setLoading(false);
  };

  const addNote = async (note: Note) => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("notes")
      .insert({ 
        ...note, 
        user_id: userId,
        pinned: false,
        archived: false,
        updated_at: getAppDateTime()
      })
      .select()
      .single();
    await fetchNotes();
    setLoading(false);
  };

  const editNote = async (note: Note) => {
    if (!userId) return;
    setLoading(true);

    const { id, ...clean } = note;

    const { data, error } = await supabase
      .from("notes")
      .update({
        title: clean.title,
        items: clean.items,
        bg_color: clean.bg_color,
        user_id: clean.user_id,
        pinned: clean.pinned,
        archived: clean.archived,
        updated_at: getAppDateTime()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) console.error(error);

    await fetchNotes();
    setLoading(false);
  };

  const togglePin = async (id: string) => {
    if (!userId) return;
    setLoading(true);
    
    const note = notes.find(n => n.id === id);
    if (!note) return;

    await supabase
      .from("notes")
      .update({ 
        pinned: !note.pinned,
        archived: false,
        updated_at: getAppDateTime()
      })
      .eq("id", id);

    await fetchNotes();
    setLoading(false);
  };

  const toggleArchive = async (id: string) => {
    if (!userId) return;
    setLoading(true);
    
    const note = notes.find(n => n.id === id);
    if (!note) return;

    await supabase
      .from("notes")
      .update({ 
        archived: !note.archived,
        pinned: false, 
        updated_at: getAppDateTime()
      })
      .eq("id", id);

    await fetchNotes();
    setLoading(false);
  };

  const deleteNote = async (id: string) => {
    if (!userId) return;
    setLoading(true);
    await supabase.from("notes").delete().eq("id", id);
    await fetchNotes();
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes();
  }, [userId]);

  return { 
    notes, 
    loading, 
    fetchNotes, 
    addNote, 
    editNote, 
    deleteNote,
    togglePin,
    toggleArchive
  };
}