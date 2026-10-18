// hooks/db/useQuickNotes.ts
//
// Szybkie notatki użytkownika. Notatki dodane Skrótem pojawiają się po
// powrocie do aplikacji: odświeżamy listę, gdy karta znów staje się widoczna.

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { QuickNote, splitQuickNoteText, QUICK_NOTES_LIMIT_MESSAGE } from "@/lib/quickNotes";

export function useQuickNotes() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [fetching, setFetching] = useState(true);
  const [available, setAvailable] = useState(true);

  const fetchNotes = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("quick_notes")
      .select("id, user_id, content, source, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    setFetching(false);
    if (error) {
      // Tabela jeszcze nie istnieje (kod przed migracją) – ukrywamy widżet zamiast straszyć błędem.
      if (error.code === "42P01" || error.code === "PGRST205") setAvailable(false);
      return;
    }
    setAvailable(true);
    setNotes((data ?? []) as QuickNote[]);
  }, [supabase, userId]);

  useEffect(() => {
    void fetchNotes();
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchNotes();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchNotes]);

  /** Dodaje jeden lub więcej punktów (każda linia osobno). Zwraca liczbę dodanych. */
  const addNotes = useCallback(
    async (text: string): Promise<number> => {
      if (!userId) return 0;
      const items = splitQuickNoteText(text);
      if (items.length === 0) return 0;

      const temp: QuickNote[] = items.map((content, i) => ({
        id: `temp-${Date.now()}-${i}`,
        user_id: userId,
        content,
        source: "app",
        created_at: new Date().toISOString(),
      }));
      setNotes((prev) => [...prev, ...temp]);

      const { data, error } = await supabase
        .from("quick_notes")
        .insert(items.map((content) => ({ user_id: userId, content, source: "app" })))
        .select("id, user_id, content, source, created_at");

      if (error) {
        setNotes((prev) => prev.filter((n) => !n.id.startsWith("temp-")));
        toast.error(error.code === "23514" ? QUICK_NOTES_LIMIT_MESSAGE : "Nie udało się dodać notatki.");
        return 0;
      }
      const tempIds = new Set(temp.map((t) => t.id));
      setNotes((prev) => [...prev.filter((n) => !tempIds.has(n.id)), ...((data ?? []) as QuickNote[])]);
      return items.length;
    },
    [supabase, userId, toast]
  );

  /** Usuwa punkt. `quiet` – bez komunikatu (np. po zamianie w zadanie). */
  const removeNote = useCallback(
    async (id: string, quiet = false): Promise<boolean> => {
      const previous = notes;
      setNotes((prev) => prev.filter((n) => n.id !== id));
      const { error } = await supabase.from("quick_notes").delete().eq("id", id);
      if (error) {
        setNotes(previous);
        toast.error("Nie udało się usunąć notatki.");
        return false;
      }
      if (!quiet) toast.success("Usunięto punkt.");
      return true;
    },
    [supabase, notes, toast]
  );

  return { notes, fetching, available, addNotes, removeNote, fetchNotes };
}
