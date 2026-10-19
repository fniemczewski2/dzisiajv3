// hooks/useMeetingPollStats.ts
//
// Obliczenia wyników ankiety terminów (liczba osób w każdym terminie,
// najlepsze przedziały, dostępność wybranej osoby i zaznaczenia) oraz lista
// kalendarzy do eksportu – wydzielone z MeetingPollResults, żeby komponent
// zajmował się tylko interfejsem.

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { bestRanges, contiguousRanges, generateTimeSlots, slotKey } from "@/lib/meetingPollGrid";
import type { MeetingPollResults as MeetingPollResultsData } from "@/types/meetingPolls";
import type { GridSelection } from "@/components/meetingPolls/MeetingPollGrid";

export interface ConnectedCalendarOption {
  id: string;
  calendar_name: string | null;
  google_calendar_id: string;
  provider: "google" | "outlook";
}

export interface Person {
  id: string;
  name: string;
}

/** Imiona osób dostępnych w każdym terminie (klucz: slotKey). */
function respondentNamesBySlot(
  data:
    | {
        responses: readonly { id: string; respondent_name: string }[];
        availabilities: readonly { response_id: string; date: string; start_time: string }[];
      }
    | null
    | undefined
): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  if (!data) return map;
  const nameByResponseId = new Map(data.responses.map((r) => [r.id, r.respondent_name]));
  for (const a of data.availabilities) {
    const name = nameByResponseId.get(a.response_id);
    if (!name) continue;
    const key = slotKey(a.date, a.start_time);
    map[key] ??= [];
    map[key].push(name);
  }
  return map;
}

export function useMeetingPollStats(
  data: MeetingPollResultsData | null,
  focusedId: string | null,
  selection: GridSelection | null
) {
  const times = useMemo(
    () => (data ? generateTimeSlots(data.poll.time_start, data.poll.time_end, data.poll.slot_duration_minutes) : []),
    [data]
  );

  const countsByKey = useMemo(() => {
    const map: Record<string, number> = {};
    if (!data) return map;
    for (const a of data.availabilities) {
      const key = slotKey(a.date, a.start_time);
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [data]);

  const respondentsByKey = useMemo(() => respondentNamesBySlot(data), [data]);

  const slotsByResponse = useMemo(() => {
    const map = new Map<string, Set<string>>();
    if (!data) return map;
    for (const a of data.availabilities) {
      const set = map.get(a.response_id) ?? new Set<string>();
      set.add(slotKey(a.date, a.start_time));
      map.set(a.response_id, set);
    }
    return map;
  }, [data]);

  const totalResponses = data?.responses.length ?? 0;
  const duration = data?.poll.slot_duration_minutes ?? 30;

  const focused = useMemo(() => data?.responses.find((r) => r.id === focusedId) ?? null, [data, focusedId]);
  const personSlots = useMemo(
    () => (focused ? (slotsByResponse.get(focused.id) ?? new Set<string>()) : null),
    [focused, slotsByResponse]
  );
  const personRanges = useMemo(
    () =>
      data && personSlots
        ? contiguousRanges(data.dates, times, duration, (d, t) => personSlots.has(slotKey(d, t)))
        : [],
    [data, personSlots, times, duration]
  );

  const best = useMemo(
    () => (data ? bestRanges(data.dates, times, duration, countsByKey) : { count: 0, ranges: [] }),
    [data, times, duration, countsByKey]
  );

  const selectionAvailability = useMemo(() => {
    const available: Person[] = [];
    const unavailable: Person[] = [];
    if (!selection || !data) return { available, unavailable };

    const requiredKeys = times
      .slice(selection.startIndex, selection.endIndex + 1)
      .map((t) => slotKey(selection.date, t));

    for (const r of data.responses) {
      const slots = slotsByResponse.get(r.id);
      const isFree = requiredKeys.every((k) => slots?.has(k));
      (isFree ? available : unavailable).push({ id: r.id, name: r.respondent_name });
    }
    return { available, unavailable };
  }, [selection, data, times, slotsByResponse]);

  return {
    times,
    countsByKey,
    respondentsByKey,
    totalResponses,
    duration,
    focused,
    personSlots,
    personRanges,
    best,
    selectionAvailability,
  };
}

/** Połączone kalendarze użytkownika (bez wpisów samego połączenia konta) – cele eksportu terminu. */
export function useCalendarOptions(): ConnectedCalendarOption[] {
  const { user, supabase } = useAuth();
  const [calendarOptions, setCalendarOptions] = useState<ConnectedCalendarOption[]>([]);
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void supabase
      .from("connected_calendars")
      .select("id, calendar_name, google_calendar_id, provider")
      .eq("user_id", user.id)
      .neq("google_calendar_id", "@account_connection")
      .then(({ data: rows }) => {
        if (!cancelled && rows) setCalendarOptions(rows as ConnectedCalendarOption[]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, supabase]);
  return calendarOptions;
}
