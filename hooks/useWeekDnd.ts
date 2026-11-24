// hooks/useWeekDnd.ts
//
// Przeciąganie w widoku tygodnia: zadanie lub wydarzenie upuszczone na kolumnę innego dnia dostaje nowy termin
// (godzina i czas trwania bez zmian, lib/weekPlan.ts). Pytanie i „Cofnij” jak na planie dnia (useConfirmedMove).
// Wystąpienia serii i wirtualne urodziny/imieniny nie są przenoszone – komunikat kieruje do kalendarza.

import { useCallback, useState } from "react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import type { Task } from "@/types/tasks";
import { useToast } from "@/providers/ToastProvider";
import { useLatestRef } from "@/hooks/useLatestRef";
import { useConfirmedMove } from "@/hooks/useConfirmedMove";
import { useOccurrenceScope } from "@/hooks/useOccurrenceScope";
import { isMovableEvent, moveEventToDay, moveTaskToDay, parseDay, parseDayDropId } from "@/lib/weekPlan";
import { seriesOccurrence } from "@/lib/eventUtils";
import { parseEventDate } from "@/lib/dateUtils";
import type { Event, EventOverride } from "@/types/events";

type EditOptions = { silent?: boolean };

/** Dane przeciąganego elementu (DraggablePlanItem `data`); `day` – kolumna źródłowa. */
export type WeekDragData = {
  kind: "task" | "event";
  itemId: string;
  day: string;
};

interface UseWeekDndProps {
  tasks: Task[];
  events: Event[];
  editTask: (task: Task & { shared_with_email?: string }, options?: EditOptions) => Promise<boolean>;
  editEvent: (event: Event & { shared_with_email?: string }, options?: EditOptions) => Promise<boolean>;
  /** Nowy termin jednego wystąpienia serii (hooks/db/useEventOverrides.ts). */
  moveOccurrence: (
    event: Event,
    occurrenceDate: string,
    start: Date,
    end: Date,
    options?: { shared?: boolean }
  ) => Promise<boolean>;
  /** Powrót wystąpienia na termin z reguły. */
  resetOccurrence: (event: Event, occurrenceDate: string) => Promise<boolean>;
  /** Obecny wyjątek wystąpienia – potrzebny do cofnięcia przeniesienia. */
  overrideFor: (eventId: string, occurrenceDate: string) => EventOverride | undefined;
}

export interface DraggedWeekItem {
  kind: "task" | "event";
  title: string;
}

export const weekTaskDragId = (id: string | number) => `week-task-${id}`;
export const weekEventDragId = (day: string, id: string) => `week-event-${day}-${id}`;

/** Cel w treści komunikatu: „26 listopada”. */
const dayLabel = (day: string) => format(parseDay(day), "d MMMM", { locale: pl });

const dragDataOf = (event: DragStartEvent | DragEndEvent): WeekDragData | null => {
  const data = event.active.data.current as Partial<WeekDragData> | undefined;
  if (!data?.kind || !data.itemId || !data.day) return null;
  return { kind: data.kind, itemId: data.itemId, day: data.day };
};

export function useWeekDnd({
  tasks,
  events,
  editTask,
  editEvent,
  moveOccurrence,
  resetOccurrence,
  overrideFor,
}: Readonly<UseWeekDndProps>) {
  const { toast } = useToast();
  const confirmMove = useConfirmedMove();
  const askScope = useOccurrenceScope();
  const [dragged, setDragged] = useState<DraggedWeekItem | null>(null);

  // Cofnięcie działa na aktualnym stanie, nie na migawce z chwili przeniesienia.
  const tasksRef = useLatestRef(tasks);
  const eventsRef = useLatestRef(events);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = dragDataOf(event);
      if (!data) return;
      const title =
        data.kind === "task"
          ? tasks.find((t) => String(t.id) === data.itemId)?.title
          : events.find((e) => String(e.id) === data.itemId)?.title;
      if (title) setDragged({ kind: data.kind, title });
    },
    [tasks, events]
  );

  const moveTask = useCallback(
    async (taskId: string, toDay: string) => {
      const current = tasks.find((t) => String(t.id) === taskId);
      if (!current || current.due_date === toDay) return;

      const previous = { due_date: current.due_date, scheduled_time: current.scheduled_time ?? null };
      await confirmMove({
        title: current.title,
        targetLabel: dayLabel(toDay),
        apply: () => editTask({ ...current, ...moveTaskToDay(current, toDay) }, { silent: true }),
        revert: () => {
          const latest = tasksRef.current.find((t) => String(t.id) === taskId) ?? current;
          return editTask({ ...latest, ...previous }, { silent: true });
        },
      });
    },
    [tasks, editTask, confirmMove, tasksRef]
  );

  /**
   * Jedno wystąpienie serii przeniesione do innej kolumny: zapis idzie do wyjątku terminu,
   * więc reguła i kolejne terminy zostają bez zmian (cotygodniowy poniedziałek raz w środę).
   */
  const moveOccurrenceToDay = useCallback(
    async (instance: Event, occurrence: { seriesId: string; occurrenceDate: string }, toDay: string) => {
      const moved = moveEventToDay(instance, instance.start_time.slice(0, 10), toDay);
      if (!moved) {
        toast.error("Nieprawidłowy czas wydarzenia.");
        return;
      }
      const before = overrideFor(occurrence.seriesId, occurrence.occurrenceDate);
      const { shared } = await askScope(instance, "move");
      await confirmMove({
        title: instance.title,
        targetLabel: dayLabel(toDay),
        apply: () =>
          moveOccurrence(
            instance,
            occurrence.occurrenceDate,
            parseEventDate(moved.start_time),
            parseEventDate(moved.end_time),
            { shared }
          ),
        revert: () =>
          before
            ? moveOccurrence(
                instance,
                occurrence.occurrenceDate,
                parseEventDate(before.start_time),
                parseEventDate(before.end_time),
                { shared: Boolean(before.shared) }
              )
            : resetOccurrence(instance, occurrence.occurrenceDate),
      });
    },
    [toast, confirmMove, moveOccurrence, resetOccurrence, overrideFor, askScope]
  );

  const moveEvent = useCallback(
    async (eventId: string, fromDay: string, toDay: string) => {
      const current = events.find((e) => String(e.id) === eventId);
      if (!current || fromDay === toDay) return;
      const occurrence = seriesOccurrence(eventId);
      if (occurrence) {
        await moveOccurrenceToDay(current, occurrence, toDay);
        return;
      }
      if (!isMovableEvent(current)) {
        toast.info("Urodziny i imieniny zmienisz w kontakcie.");
        return;
      }
      const moved = moveEventToDay(current, fromDay, toDay);
      if (!moved) {
        toast.error("Nieprawidłowy czas wydarzenia.");
        return;
      }

      const previous = { start_time: current.start_time, end_time: current.end_time };
      await confirmMove({
        title: current.title,
        targetLabel: dayLabel(toDay),
        apply: () => editEvent({ ...current, ...moved }, { silent: true }),
        revert: () => {
          const latest = eventsRef.current.find((e) => String(e.id) === eventId) ?? current;
          return editEvent({ ...latest, ...previous }, { silent: true });
        },
      });
    },
    [events, editEvent, toast, confirmMove, eventsRef, moveOccurrenceToDay]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setDragged(null);
      const data = dragDataOf(event);
      const toDay = event.over ? parseDayDropId(String(event.over.id)) : null;
      if (!data || !toDay) return;

      if (data.kind === "task") await moveTask(data.itemId, toDay);
      else await moveEvent(data.itemId, data.day, toDay);
    },
    [moveTask, moveEvent]
  );

  const handleDragCancel = useCallback(() => setDragged(null), []);

  return { dragged, handleDragStart, handleDragEnd, handleDragCancel };
}
