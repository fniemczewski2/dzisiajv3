import { useState, useEffect, useCallback } from "react";
import { Note } from "@/types/notes";
import { getAppDateTime } from "@/lib/dateUtils";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

export function useNotes() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [notes, setNotes] = useState<Note[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  useEffect(() => {
    let toastId: string | undefined;
    if (fetching  && toast.loading) toastId = toast.loading("Ładowanie celów...");
    return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [fetching, toast]);

  const fetchNotes = useCallback(async () => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }); 

      if (error) throw error;

      const fetchedNotes = (data as Note[]) || [];
      setNotes(fetchedNotes);
    } catch {
      toast.error("Błąd pobierania notatek");
    } finally {
      setFetching(false);
    }
  }, [userId, supabase, toast]);

  const addNote = async (note: Note) => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
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
      toast.success("Dodano notatkę");
      await fetchNotes();
    } catch {
      toast.error("Błąd dodawania notatki");
    } finally {
      setLoading(false);
    }
  };

  const editNote = async (note: Note) => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
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
      toast.success("Zaktualizowano notatkę");
      await fetchNotes();
    } catch {
      toast.error("Błąd aktualizacji notatki");
    } finally {
      setLoading(false);
    }
  };

  const togglePin = async (id: string) => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setLoading(true);
    try {
      const note = notes.find(n => n.id === id);
      if (!note) return;
      const newPinned = !note.pinned;
      setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: newPinned, archived: false } : n));
      await supabase
        .from("notes")
        .update({ archived: false, pinned: newPinned })
        .eq("id", id);
      toast.success(newPinned ? "Przypięto notatkę" : "Odepnieto notatkę");
    } catch {
      toast.error("Błąd przypięcia notatki");
    } finally {
      setLoading(false);
    }
  };

  const toggleArchive = async (id: string) => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setLoading(true);

    try {
      const note = notes.find(n => n.id === id);
      if (!note) return;
      const newArchived = !note.archived;
      setNotes(prev => prev.map(n => n.id === id ? { ...n, archived: newArchived, pinned: false } : n));
      await supabase
        .from("notes")
        .update({ archived: newArchived, pinned: false })
        .eq("id", id);
      toast.success(newArchived ? "Zarchiwizowano notatkę" : "Przywrócono notatkę");
        } catch {
          toast.error("Błąd archiwizacji notatki");
        } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (id: string) => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    const ok = await toast.confirm(
      `Czy chcesz usunąć notatkę?`
    );
    if (!ok) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success("Usunięto notatkę");
    } catch {
      toast.error("Błąd usuwania notatki");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return { notes, loading, fetching, fetchNotes, addNote, editNote, deleteNote, togglePin, toggleArchive };
}