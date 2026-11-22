// hooks/useDashboardDnd.ts
//
// Przeciąganie na planie dnia: zadanie lub wydarzenie upuszczone na slot godzinowy dostaje nową godzinę
// (pytanie i „Cofnij” – useConfirmedMove). usePlanSensors – czujniki wspólne z widokiem tygodnia.

import { useState, useCallback } from "react";
import { MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { Task } from "@/types/tasks";
import { Event } from "@/types/events";
import { dateToTimestamp, parseEventDate } from "@/lib/dateUtils";
import { useToast } from "@/providers/ToastProvider";
import { useLatestRef } from "@/hooks/useLatestRef";
import { useConfirmedMove } from "@/hooks/useConfirmedMove";
import { useOccurrenceScope } from "@/hooks/useOccurrenceScope";
import { isMovableEvent } from "@/lib/weekPlan";
import { seriesOccurrence } from "@/lib/eventUtils";
import type { EventOverride } from "@/types/events";

type EditOptions = { silent?: boolean };

interface UseDashboardDndProps {
  tasks: Task[];
  events: Event[];
  userId: string | undefined;
  date: Date;
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

const formatHm = (hours: number, minutes: number): string =>
  `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

/** Godzina (HH) z zapisu „yyyy-MM-ddTHH:mm:ss(+00)”, bez interpretacji strefy. */
const hourOf = (timestamp: string | null | undefined): number | null => {
  if (!timestamp) return null;
  const d = parseEventDate(timestamp);
  return Number.isNaN(d.getTime()) ? null : d.getHours();
};

interface DropSlot {
  hours: number;
  minutes: number;
  label: string;
}

/** Godzina z miejsca upuszczenia (dane slotu albo jego id, np. „09:30”); null, gdy to nie jest slot godzinowy. */
function parseDropSlot(over: NonNullable<DragEndEvent["over"]>): DropSlot | null {
  const targetTime = over.data?.current?.time || String(over.id);
  if (!targetTime || typeof targetTime !== "string" || !targetTime.includes(":")) return null;
  const [hours, minutes] = targetTime.split(":").map(Number);
  if (Number.isNaN(hours)) return null;
  return { hours, minutes: minutes || 0, label: formatHm(hours, minutes || 0) };
}

const isTaskDrag = (dragId: string) => dragId.startsWith("plan-task-") || dragId.startsWith("task-");
const isEventDrag = (dragId: string) => dragId.startsWith("plan-event-") || dragId.startsWith("side-event-");
const taskIdOf = (dragId: string) => dragId.replace("plan-task-", "").replace("task-", "");
const eventIdOf = (dragId: string) => dragId.replace("plan-event-", "").replace("side-event-", "");

/** Przytrzymanie wymagane do rozpoczęcia przeciągania palcem; krótszy ruch to przewijanie strony. */
const TOUCH_DRAG_DELAY_MS = 350;
/** Dopuszczalny ruch palca w czasie przytrzymania (px); większy anuluje przeciąganie na rzecz przewijania. */
const TOUCH_DRAG_TOLERANCE_PX = 8;

/**
 * Czujniki przeciągania planu (dzień i tydzień): mysz po 8 px, dotyk po przytrzymaniu.
 * MouseSensor zamiast PointerSensor – PointerSensor obsługuje też zdarzenia dotyku i uruchamiał
 * przeciąganie po 8 px przesunięcia palca, zanim zadziałało opóźnienie TouchSensor (blokada przewijania).
 */
export function usePlanSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: TOUCH_DRAG_DELAY_MS, tolerance: TOUCH_DRAG_TOLERANCE_PX },
    })
  );
}

export function useDashboardDnd({
  tasks,
  events,
  userId,
  date,
  editTask,
  editEvent,
  moveOccurrence,
  resetOccurrence,
  overrideFor,
}: Readonly<UseDashboardDndProps>) {
  const { toast } = useToast();
  const confirmMove = useConfirmedMove();
  const askScope = useOccurrenceScope();
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [draggedEventTitle, setDraggedEventTitle] = useState<string | null>(null);

  // Cofnięcie działa na aktualnym stanie, nie na migawce z chwili przesunięcia.
  const tasksRef = useLatestRef(tasks);
  const eventsRef = useLatestRef(events);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const dragId = String(event.active.id);

      if (dragId.startsWith("plan-task-") || dragId.startsWith("task-")) {
        const rawId = dragId.replace("plan-task-", "").replace("task-", "");
        const task = tasks.find((t) => String(t.id) === rawId);
        if (task) setDraggedTask(task);
      } else if (dragId.startsWith("plan-event-") || dragId.startsWith("side-event-")) {
        const rawId = dragId.replace("plan-event-", "").replace("side-event-", "");
        const evt = events.find((e) => String(e.id) === rawId);
        if (evt) setDraggedEventTitle(evt.title);
      }
    },
    [tasks, events]
  );

  const moveTask = useCallback(
    async (rawId: string, slot: DropSlot) => {
      const currentTask = tasks.find((t) => String(t.id) === rawId);
      if (!currentTask) return;
      // Upuszczenie w tym samym slocie godzinowym = brak zmiany.
      if (currentTask.scheduled_time && hourOf(currentTask.scheduled_time) === slot.hours) return;

      const previousTime = currentTask.scheduled_time ?? null;
      const scheduledDateTime = new Date(date);
      scheduledDateTime.setHours(slot.hours, slot.minutes, 0, 0);

      await confirmMove({
        title: currentTask.title,
        targetLabel: slot.label,
        apply: () => editTask({ ...currentTask, scheduled_time: dateToTimestamp(scheduledDateTime) }, { silent: true }),
        revert: () => {
          const latest = tasksRef.current.find((t) => String(t.id) === rawId) ?? currentTask;
          return editTask({ ...latest, scheduled_time: previousTime }, { silent: true });
        },
      });
    },
    [tasks, date, editTask, confirmMove, tasksRef]
  );

  /**
   * Przeniesienie jednego wystąpienia serii na planie dnia: zapisujemy wyjątek terminu,
   * a nie wiersz serii. „Cofnij” przywraca poprzedni wyjątek albo usuwa nowy.
   */
  const moveSeriesOccurrence = useCallback(
    async (instance: Event, occurrence: { seriesId: string; occurrenceDate: string }, slot: DropSlot) => {
      if (hourOf(instance.start_time) === slot.hours) return;
      const oldStart = parseEventDate(instance.start_time);
      const oldEnd = parseEventDate(instance.end_time);
      const durationMs = oldEnd.getTime() - oldStart.getTime();
      if (Number.isNaN(durationMs)) {
        toast.error("Nieprawidłowy czas wydarzenia.");
        return;
      }
      const newStart = new Date(date);
      newStart.setHours(slot.hours, slot.minutes, 0, 0);
      const newEnd = new Date(newStart.getTime() + durationMs);
      const before = overrideFor(occurrence.seriesId, occurrence.occurrenceDate);
      const { shared } = await askScope(instance, "move");

      await confirmMove({
        title: instance.title,
        targetLabel: slot.label,
        apply: () => moveOccurrence(instance, occurrence.occurrenceDate, newStart, newEnd, { shared }),
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
    [date, toast, confirmMove, moveOccurrence, resetOccurrence, overrideFor, askScope]
  );

  const moveEvent = useCallback(
    async (eventId: string, slot: DropSlot) => {
      const currentEvent = events.find((e) => String(e.id) === eventId);
      if (!currentEvent) return;
      const occurrence = seriesOccurrence(eventId);
      // Wystąpienie serii dostaje wyjątek terminu – reguła i kolejne terminy zostają bez zmian.
      if (occurrence) {
        await moveSeriesOccurrence(currentEvent, occurrence, slot);
        return;
      }
      if (!isMovableEvent(currentEvent)) {
        toast.info("Urodziny i imieniny zmienisz w kontakcie.");
        return;
      }
      if (hourOf(currentEvent.start_time) === slot.hours) return;

      // parseEventDate rozumie zapis „…+00” z dateToTimestamp (optymistyczny stan po 1. przesunięciu);
      // new Date("…T10:00:00+00") zwraca Invalid Date → NaN w zapisie → błąd przy 2. przesunięciu.
      const oldStart = parseEventDate(currentEvent.start_time);
      const oldEnd = parseEventDate(currentEvent.end_time);
      const durationMs = oldEnd.getTime() - oldStart.getTime();
      if (Number.isNaN(durationMs)) {
        toast.error("Nieprawidłowy czas wydarzenia.");
        return;
      }

      const previous = { start_time: currentEvent.start_time, end_time: currentEvent.end_time };
      const newStart = new Date(date);
      newStart.setHours(slot.hours, slot.minutes, 0, 0);
      const newEnd = new Date(newStart.getTime() + durationMs);

      await confirmMove({
        title: currentEvent.title,
        targetLabel: slot.label,
        apply: () =>
          editEvent(
            { ...currentEvent, start_time: dateToTimestamp(newStart), end_time: dateToTimestamp(newEnd) },
            { silent: true }
          ),
        revert: () => {
          const latest = eventsRef.current.find((e) => String(e.id) === eventId) ?? currentEvent;
          return editEvent({ ...latest, ...previous }, { silent: true });
        },
      });
    },
    [events, date, editEvent, toast, confirmMove, eventsRef, moveSeriesOccurrence]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setDraggedTask(null);
      setDraggedEventTitle(null);

      if (!over || !userId) return;
      const slot = parseDropSlot(over);
      if (!slot) return;

      const dragId = String(active.id);
      if (isTaskDrag(dragId)) await moveTask(taskIdOf(dragId), slot);
      else if (isEventDrag(dragId)) await moveEvent(eventIdOf(dragId), slot);
    },
    [userId, moveTask, moveEvent]
  );

  return { draggedTask, draggedEventTitle, handleDragStart, handleDragEnd };
}
