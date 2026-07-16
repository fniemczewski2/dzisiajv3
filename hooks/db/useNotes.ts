import { useState, useEffect, useCallback } from "react";
import { Note } from "@/types/notes";
import { getAppDateTime } from "@/lib/dateUtils";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";

export function useNotes() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [notes, setNotes] = useState<Note[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const withRetry = useRetry();

  const fetchNotes = useCallback(async () => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setFetching(true);
    try {
      const { data, error } = await withRetry(async () =>
        supabase.from("notes").select("*").eq("user_id", userId).order("updated_at", { ascending: false })
      );

      if (error) throw error;
      setNotes((data as Note[]) || []);
    } catch {
      toast.error("Błąd pobierania notatek.");
    } finally {
      setFetching(false);
    }
  }, [userId, supabase, toast, withRetry]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const addNote = useCallback(
    async (note: Note) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const tempId = `temp-${Date.now()}`;
      const optimisticNote = { ...note, id: tempId, user_id: userId, pinned: false, archived: false } as Note;
      setNotes((prev) => [optimisticNote, ...prev]);

      try {
        const { data, error } = await withRetry(async () =>
          supabase
            .from("notes")
            .insert({ ...note, user_id: userId, pinned: false, archived: false, updated_at: getAppDateTime() })
            .select()
            .single()
        );
        if (error) throw error;
        setNotes((prev) => prev.map((n) => (n.id === tempId ? (data as Note) : n)));
        toast.success("Dodano notatkę");
      } catch {
        setNotes((prev) => prev.filter((n) => n.id !== tempId));
        toast.error("Błąd dodawania notatki.");
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, toast, withRetry]
  );

  const editNote = useCallback(
    async (note: Note) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const previous = notes;
      const { id, ...clean } = note;
      setNotes((prev) => prev.map((n) => (n.id === id ? note : n)));

      try {
        const { error } = await withRetry(async () =>
          supabase
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
        );
        if (error) throw error;
        toast.success("Zaktualizowano notatkę");
      } catch {
        setNotes(previous);
        toast.error("Błąd aktualizacji notatki.");
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, notes, toast, withRetry]
  );

  const togglePin = useCallback(
    async (id: string) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      setLoading(true);
      const previous = notes;
      const newPinned = !note.pinned;
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, pinned: newPinned, archived: false } : n)));

      try {
        const { error } = await withRetry(async () =>
          supabase.from("notes").update({ archived: false, pinned: newPinned }).eq("id", id)
        );
        if (error) throw error;
        toast.success(newPinned ? "Przypięto notatkę" : "Odpięto notatkę");
      } catch {
        setNotes(previous);
        toast.error("Błąd przypinania notatki.");
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, notes, toast, withRetry]
  );

  const toggleArchive = useCallback(
    async (id: string) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      setLoading(true);
      const previous = notes;
      const newArchived = !note.archived;
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, archived: newArchived, pinned: false } : n)));

      try {
        const { error } = await withRetry(async () =>
          supabase.from("notes").update({ archived: newArchived, pinned: false }).eq("id", id)
        );
        if (error) throw error;
        toast.success(newArchived ? "Zarchiwizowano notatkę" : "Przywrócono notatkę");
      } catch {
        setNotes(previous);
        toast.error("Błąd archiwizacji notatki.");
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, notes, toast, withRetry]
  );

  const deleteNote = useCallback(
    async (id: string) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      const ok = await toast.confirm(`Czy chcesz usunąć notatkę?`);
      if (!ok) return;

      setLoading(true);
      const previous = notes;
      setNotes((prev) => prev.filter((n) => n.id !== id));

      try {
        const { error } = await withRetry(async () => supabase.from("notes").delete().eq("id", id));
        if (error) throw error;
        toast.success("Usunięto notatkę");
      } catch {
        setNotes(previous);
        toast.error("Błąd usuwania notatki.");
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, notes, toast, withRetry]
  );

  return { notes, loading, fetching, fetchNotes, addNote, editNote, deleteNote, togglePin, toggleArchive };
}
