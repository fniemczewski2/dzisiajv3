// hooks/db/useEventOverrides.ts
//
// Wyjątki pojedynczych terminów serii (tabela event_overrides): przeniesienie albo odwołanie jednego
// wystąpienia nie rusza reguły, więc kolejne terminy wypadają tak jak dotąd. Kluczem wystąpienia jest
// dzień z siatki reguły (`occurrence_date`) – zostaje nim także po przeniesieniu terminu na inny dzień.
//
// Wydarzenie współdzielone: `shared` decyduje, czy wyjątek widzi też druga strona (o wybór pyta
// użytkownika warstwa przeciągania). Wydarzenie powiązane z Google/Outlookiem dostaje ten sam wyjątek
// u dostawcy – tam zmieniane jest samo wystąpienie serii (lib/calendarExport.ts).

import { useCallback, useState } from "react";
import { useQueryState } from "@/hooks/useQueryState";
import { NotSignedInError } from "@/lib/errors";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";
import { isAbortError } from "@/lib/abortUtils";
import { useLatestRef } from "@/hooks/useLatestRef";
import { OCCURRENCE_OVERRIDE_WINDOW_DAYS, seriesOccurrence } from "@/lib/eventUtils";
import { dateToTimestamp } from "@/lib/dateUtils";
import { syncLinkedOccurrenceChange } from "@/lib/calendarExport";
import type { Event, EventOverride } from "@/types/events";

const NO_OVERRIDES: EventOverride[] = [];

/** Dzień „yyyy-MM-dd” przesunięty o `days` (arytmetyka w UTC – chodzi o samą datę). */
function shiftDay(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Id serii: z wystąpienia „<id>_<yyyy-MM-dd>” albo samo wydarzenie, gdy dostaliśmy wiersz serii. */
const seriesIdOf = (event: Event): string => seriesOccurrence(String(event.id))?.seriesId ?? String(event.id);

export interface OccurrenceOptions {
  /** Wyjątek obowiązuje obie strony wydarzenia współdzielonego. */
  shared?: boolean;
}

export function useEventOverrides(rangeStart: string, rangeEnd: string) {
  const { supabase, user } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const withRetry = useRetry();
  const [saving, setSaving] = useState(false);
  const hasRange = Boolean(rangeStart && rangeEnd);

  // Zakres szerszy o okno przeniesień: wyjątek z dnia tuż przed widokiem może przenosić termin do widoku.
  const queryFrom = rangeStart ? shiftDay(rangeStart, -OCCURRENCE_OVERRIDE_WINDOW_DAYS) : "";
  const queryTo = rangeEnd ? shiftDay(rangeEnd, OCCURRENCE_OVERRIDE_WINDOW_DAYS) : "";

  const queryOverrides = useCallback(
    async ({ signal }: { signal: AbortSignal }): Promise<EventOverride[]> => {
      if (!userId) throw new NotSignedInError();
      try {
        // Bez filtra po user_id: RLS dokłada wyjątki „dla obu stron” z wydarzeń udostępnionych.
        const { data, error } = await withRetry(
          () =>
            supabase
              .from("event_overrides")
              .select(
                "event_id, occurrence_date, start_time, end_time, rule_start_time, rule_end_time, canceled, shared"
              )
              .gte("occurrence_date", queryFrom)
              .lte("occurrence_date", queryTo)
              .abortSignal(signal),
          signal
        );
        if (error) throw error;
        return (data || []) as EventOverride[];
      } catch (err) {
        if (!isAbortError(err)) toast.error("Błąd pobierania zmienionych terminów.", { cause: err });
        throw err;
      }
    },
    [supabase, userId, queryFrom, queryTo, toast, withRetry]
  );

  const {
    data: overrides,
    setData: setOverrides,
    refetch: fetchOverrides,
  } = useQueryState<EventOverride[]>({
    queryKey: ["event-overrides", userId ?? null, queryFrom, queryTo],
    queryFn: queryOverrides,
    initial: NO_OVERRIDES,
    enabled: Boolean(userId) && hasRange,
  });
  // Cofnięcie z toastu ma starsze domknięcie – przywracamy stan aktualny w chwili cofania.
  const overridesRef = useLatestRef(overrides);

  /** Wyjątek tego wystąpienia, jeśli istnieje. */
  const overrideFor = useCallback(
    (eventId: string, occurrenceDate: string): EventOverride | undefined =>
      overridesRef.current.find((o) => o.event_id === eventId && o.occurrence_date === occurrenceDate),
    [overridesRef]
  );

  /** Zapis wyjątku (przeniesienie albo odwołanie) wraz z synchronizacją kalendarza zewnętrznego. */
  const writeOverride = useCallback(
    async (event: Event, draft: EventOverride, errorMessage: string): Promise<boolean> => {
      if (!userId) throw new NotSignedInError();
      const seriesId = draft.event_id;
      const previous = overridesRef.current;
      // Termin z reguły zapamiętujemy przy pierwszej zmianie – przy kolejnych `event` ma już czas z wyjątku.
      const existing = previous.find((o) => o.event_id === seriesId && o.occurrence_date === draft.occurrence_date);
      const row: EventOverride = {
        ...draft,
        rule_start_time: existing?.rule_start_time ?? event.start_time,
        rule_end_time: existing?.rule_end_time ?? event.end_time,
      };
      setOverrides([
        ...previous.filter((o) => !(o.event_id === seriesId && o.occurrence_date === row.occurrence_date)),
        row,
      ]);
      setSaving(true);
      try {
        const { error } = await withRetry(() =>
          supabase
            .from("event_overrides")
            .upsert(
              { ...row, user_id: userId, updated_at: new Date().toISOString() },
              { onConflict: "user_id,event_id,occurrence_date" }
            )
        );
        if (error) throw error;

        const remote = await syncLinkedOccurrenceChange(
          supabase,
          { ...event, id: seriesId },
          {
            occurrenceDate: row.occurrence_date,
            startTime: row.start_time,
            endTime: row.end_time,
            canceled: row.canceled,
          },
          userId
        );
        if (remote.linked && !remote.ok) {
          const where = remote.label ? ` ${remote.label}` : "";
          toast.error(`Zapisano w aplikacji, ale nie w kalendarzu${where}. Spróbuj ponownie później.`);
          return false;
        }
        return true;
      } catch (err) {
        setOverrides(previous);
        toast.error(errorMessage, { cause: err });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [supabase, userId, overridesRef, setOverrides, toast, withRetry]
  );

  /** Nowy termin jednego wystąpienia serii. Reguła i pozostałe terminy bez zmian. */
  const moveOccurrence = useCallback(
    (event: Event, occurrenceDate: string, start: Date, end: Date, options: OccurrenceOptions = {}): Promise<boolean> =>
      writeOverride(
        event,
        {
          event_id: seriesIdOf(event),
          occurrence_date: occurrenceDate,
          start_time: dateToTimestamp(start),
          end_time: dateToTimestamp(end),
          canceled: false,
          shared: Boolean(options.shared),
        },
        "Błąd zapisu nowego terminu."
      ),
    [writeOverride]
  );

  /** Odwołanie jednego terminu: tego razu wydarzenia nie ma, seria biegnie dalej. */
  const cancelOccurrence = useCallback(
    (event: Event, occurrenceDate: string, options: OccurrenceOptions = {}): Promise<boolean> =>
      writeOverride(
        event,
        {
          event_id: seriesIdOf(event),
          occurrence_date: occurrenceDate,
          // Zostaje ostatnio znany termin – po przywróceniu i tak liczy się reguła.
          start_time: event.start_time,
          end_time: event.end_time,
          canceled: true,
          shared: Boolean(options.shared),
        },
        "Błąd odwoływania terminu."
      ),
    [writeOverride]
  );

  /** Powrót wystąpienia na termin z reguły (usunięcie wyjątku). */
  const resetOccurrence = useCallback(
    async (event: Event, occurrenceDate: string): Promise<boolean> => {
      if (!userId) throw new NotSignedInError();
      const seriesId = seriesIdOf(event);
      const previous = overridesRef.current;
      const removed = previous.find((o) => o.event_id === seriesId && o.occurrence_date === occurrenceDate);
      setOverrides(previous.filter((o) => !(o.event_id === seriesId && o.occurrence_date === occurrenceDate)));
      setSaving(true);
      try {
        const { error } = await withRetry(() =>
          supabase.from("event_overrides").delete().eq("event_id", seriesId).eq("occurrence_date", occurrenceDate)
        );
        if (error) throw error;

        // U dostawcy wracamy do terminu z reguły; odwołanego wystąpienia Google/Outlook nie odtworzy.
        if (removed && !removed.canceled) {
          await syncLinkedOccurrenceChange(
            supabase,
            { ...event, id: seriesId },
            {
              occurrenceDate,
              startTime: removed.rule_start_time ?? event.start_time,
              endTime: removed.rule_end_time ?? event.end_time,
            },
            userId
          );
        }
        return true;
      } catch (err) {
        setOverrides(previous);
        toast.error("Błąd przywracania terminu.", { cause: err });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [supabase, userId, overridesRef, setOverrides, toast, withRetry]
  );

  return { overrides, saving, fetchOverrides, overrideFor, moveOccurrence, cancelOccurrence, resetOccurrence };
}
