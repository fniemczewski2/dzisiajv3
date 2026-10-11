// hooks/useEventConflicts.ts
//
// Sprawdza na bieżąco, czy wpisywany termin nakłada się na inne wydarzenia.
// Pobiera z bazy tylko kandydatów: wydarzenia, które zaczynają się przed końcem
// sprawdzanego terminu i (kończą się po jego początku albo są cykliczne).
// Zapytanie idzie z opóźnieniem 300 ms, żeby nie strzelać przy każdym znaku.

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { Event } from "@/types/events";
import { dateToTimestamp } from "@/lib/dateUtils";
import { ConflictReport, findConflicts } from "@/lib/eventConflicts";

const EMPTY: ConflictReport = { overlaps: [], allDay: [] };

/** „2026-10-12T10:00” albo „2026-10-12” → Date w czasie lokalnym. */
export function parseLocalInput(value: string, endOfDay = false): Date | null {
  if (!value) return null;
  const [datePart, timePart] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return null;
  if (!timePart) return endOfDay ? new Date(y, m - 1, d, 23, 59, 59) : new Date(y, m - 1, d, 0, 0, 0);
  const [hh, mm] = timePart.split(":").map(Number);
  const result = new Date(y, m - 1, d, hh || 0, mm || 0, 0);
  return Number.isNaN(result.getTime()) ? null : result;
}

interface Options {
  /** Edytowane wydarzenie – nie koliduje samo ze sobą. */
  ignoreId?: string | null;
  allDay?: boolean;
  /** Wyłącza sprawdzanie (np. formularz zamknięty). */
  enabled?: boolean;
}

export function useEventConflicts(start: Date | null, end: Date | null, options: Options = {}) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { ignoreId = null, allDay = false, enabled = true } = options;
  const [report, setReport] = useState<ConflictReport>(EMPTY);
  const [checking, setChecking] = useState(false);

  const startMs = start?.getTime() ?? null;
  const endMs = end?.getTime() ?? null;

  useEffect(() => {
    if (!enabled || !userId || !supabase || startMs === null || endMs === null || endMs <= startMs) {
      setReport(EMPTY);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setChecking(true);
      const startTs = dateToTimestamp(new Date(startMs));
      const endTs = dateToTimestamp(new Date(endMs));
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .lte("start_time", endTs)
        .or(`repeat.neq.none,end_time.gte."${startTs}"`)
        .limit(500);
      if (cancelled) return;
      setChecking(false);
      if (error) {
        // Brak sprawdzenia nie może blokować zapisu – po prostu nie ostrzegamy.
        setReport(EMPTY);
        return;
      }
      // RLS pokazuje też dane zaufanych osób – kolizje liczymy tylko z własnym kalendarzem.
      const own = ((data ?? []) as Event[]).filter((e) => e.user_id === userId || e.shared_with_id === userId);
      setReport(findConflicts(new Date(startMs), new Date(endMs), own, { ignoreId, candidateAllDay: allDay }));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, userId, supabase, startMs, endMs, ignoreId, allDay]);

  return { report, checking, hasOverlaps: report.overlaps.length > 0 };
}
