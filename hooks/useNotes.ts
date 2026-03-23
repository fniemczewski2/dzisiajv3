import { useState, useEffect, useCallback } from "react";
import { Note } from "../types";
import { getAppDateTime } from "../lib/dateUtils";
import { useAuth } from "../providers/AuthProvider";

export function useNotes() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [notes, setNotes] = useState<Note[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!userId) return;
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      setNotes((data as Note[]) || []);
    } finally {
      setFetching(false);
    }
  }, [userId, supabase]);

  const addNote = async (note: Note) => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    try {
      const { error } = await supabase
        .from("notes")
        .insert({
          ...note,
          user_id: userId,
          pinned: false,
          archived: false,
          updated_at: getAppDateTime(),
        })
        .select()
        .single();
      if (error) throw error;
      await fetchNotes();
    } finally {
      setLoading(false);
    }
  };

  const editNote = async (note: Note) => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    try {
      const { id, ...clean } = note;
      const { error } = await supabase
        .from("notes")
        .update({
          title: clean.title,
          items: clean.items,
          bg_color: clean.bg_color,
          user_id: clean.user_id,
          pinned: clean.pinned,
          archived: clean.archived,
          updated_at: getAppDateTime(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await fetchNotes();
    } finally {
      setLoading(false);
    }
  };

  const togglePin = async (id: string) => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    try {
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      const { error } = await supabase
        .from("notes")
        .update({ pinned: !note.pinned, archived: false, updated_at: getAppDateTime() })
        .eq("id", id);
      if (error) throw error;
      await fetchNotes();
    } finally {
      setLoading(false);
    }
  };

  const toggleArchive = async (id: string) => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    try {
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      const { error } = await supabase
        .from("notes")
        .update({ archived: !note.archived, pinned: false, updated_at: getAppDateTime() })
        .eq("id", id);
      if (error) throw error;
      await fetchNotes();
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (id: string) => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    try {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
      await fetchNotes();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return { notes, loading, fetching, fetchNotes, addNote, editNote, deleteNote, togglePin, toggleArchive };
}