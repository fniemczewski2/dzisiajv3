// hooks/db/useQuickNotes.ts
//
// Szybkie notatki użytkownika. Notatki dodane Skrótem pojawiają się po
// powrocie do aplikacji: odświeżamy listę, gdy karta znów staje się widoczna.

import { useQueryState } from "@/hooks/useQueryState";
import { useCallback, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { QuickNote, splitQuickNoteText, QUICK_NOTES_LIMIT_MESSAGE } from "@/lib/quickNotes";

const INITIAL_STATE: { notes: QuickNote[]; available: boolean } = { notes: [], available: true };

export function useQuickNotes() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  // Brak tabeli (kod przed migracją bazy) – widżet jest ukrywany zamiast pokazywać błąd.
  const queryNotes = useCallback(
    async ({ signal }: { signal: AbortSignal }): Promise<{ notes: QuickNote[]; available: boolean }> => {
      const { data, error } = await supabase
        .from("quick_notes")
        .select("id, user_id, content, source, created_at")
        .eq("user_id", userId as string)
        .order("created_at", { ascending: true })
        .abortSignal(signal);
      if (error) {
        if (error.code === "42P01" || error.code === "PGRST205") return { notes: [], available: false };
        throw error;
      }
      return { notes: (data ?? []) as QuickNote[], available: true };
    },
    [supabase, userId]
  );
  const {
    data: state,
    setData: setState,
    fetching,
    refetch: fetchNotes,
  } = useQueryState<{ notes: QuickNote[]; available: boolean }>({
    queryKey: ["quick-notes", userId ?? null],
    queryFn: queryNotes,
    initial: INITIAL_STATE,
    enabled: Boolean(userId),
  });
  const notes = state.notes;
  const available = state.available;
  const setNotes = useCallback(
    (updater: QuickNote[] | ((prev: QuickNote[]) => QuickNote[])) =>
      setState((prev) => ({
        ...prev,
        notes: typeof updater === "function" ? updater(prev.notes) : updater,
      })),
    [setState]
  );

  // Notatki dodane ze Skrótów Siri na telefonie – odświeżenie po powrocie do karty.
  useEffect(() => {
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
    [supabase, userId, toast, setNotes]
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
    [supabase, notes, toast, setNotes]
  );

  return { notes, fetching, available, addNotes, removeNote, fetchNotes };
}
