// hooks/useSharedListNotifier.ts
//
// Powiadomienia o zmianach na wspólnej liście. Każda zmiana (dodanie, usunięcie pozycji) trafia do bufora listy;
// gdy przez SHARED_LIST_NOTIFY_DELAY_MS nie ma kolejnej, wysyłamy jedno zbiorcze powiadomienie
// (np. „Dodano 3 i usunięto 2 pozycje na liście „Zakupy””). Zmiany zbędne (dodane i od razu usunięte) znoszą się.
// Bufor wysyłamy też przy ukryciu karty i zamknięciu widoku. Błąd wysyłki nie wpływa na samą listę.

import { useCallback, useEffect, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SHARED_LIST_NOTIFY_DELAY_MS } from "@/config/timing";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { diffElements, mergeChange, toPayload, type ChangeBuffer, type TextItem } from "@/lib/sharedListChanges";
import { useLatestRef } from "@/hooks/useLatestRef";

export function useSharedListNotifier(
  supabase: SupabaseClient,
  /** Czeka na zapisy listy w toku – serwer sprawdza zmianę względem stanu z bazy. */
  waitForWrites: (listId: string) => Promise<unknown> = () => Promise.resolve(),
  delayMs: number = SHARED_LIST_NOTIFY_DELAY_MS
) {
  const buffers = useRef<Record<string, ChangeBuffer>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabaseRef = useLatestRef(supabase);
  const waitRef = useLatestRef(waitForWrites);

  const flush = useCallback(
    async (listId: string) => {
      clearTimeout(timers.current[listId]);
      delete timers.current[listId];
      const buffer = buffers.current[listId];
      delete buffers.current[listId];
      if (!buffer) return;
      const payload = toPayload(buffer);
      if (payload.added.length + payload.removed.length === 0) return;
      try {
        await waitRef.current(listId);
        await invokeEdgeFunction(supabaseRef.current, "notify-shared", { kind: "list_item", id: listId, ...payload });
      } catch {
        // Powiadomienie jest dodatkiem – nie przerywamy pracy z listą.
      }
    },
    [supabaseRef, waitRef]
  );

  const flushAll = useCallback(() => {
    for (const listId of Object.keys(buffers.current)) void flush(listId);
  }, [flush]);

  const track = useCallback(
    (listId: string, prev: readonly TextItem[], next: readonly TextItem[]) => {
      const change = diffElements(prev, next);
      if (change.size === 0) return;
      const buffer = buffers.current[listId] ?? new Map();
      mergeChange(buffer, change);
      buffers.current[listId] = buffer;
      clearTimeout(timers.current[listId]);
      timers.current[listId] = setTimeout(() => void flush(listId), delayMs);
    },
    [flush, delayMs]
  );

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushAll();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushAll);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flushAll);
      flushAll();
    };
  }, [flushAll]);

  return { track };
}
