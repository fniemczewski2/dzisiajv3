// hooks/useDashboardDnd.ts

import { useState, useCallback } from "react";
import { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { Task } from "@/types/tasks";
import { Event } from "@/types/events";
import { dateToTimestamp, parseEventDate } from "@/lib/dateUtils";
import { useToast } from "@/providers/ToastProvider";
import { UNDO_WINDOW_MS } from "@/config/timing";
import { useLatestRef } from "@/hooks/useLatestRef";

type EditOptions = { silent?: boolean };

interface UseDashboardDndProps {
  tasks: Task[];
  events: Event[];
  userId: string | undefined;
  date: Date;
  editTask: (task: Task & { shared_with_email?: string }, options?: EditOptions) => Promise<boolean>;
  editEvent: (event: Event & { shared_with_email?: string }, options?: EditOptions) => Promise<boolean>;
}

const formatHm = (hours: number, minutes: number): string =>
  `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

/** Godzina (HH) z zapisu „yyyy-MM-ddTHH:mm:ss(+00)”, bez interpretacji strefy. */
const hourOf = (timestamp: string | null | undefined): number | null => {
  if (!timestamp) return null;
  const d = parseEventDate(timestamp);
  return Number.isNaN(d.getTime()) ? null : d.getHours();
};

export const MOVE_CONFIRM_OPTIONS = { confirmLabel: "Przenieś", cancelLabel: "Anuluj" } as const;

export function useDashboardDnd({ tasks, events, userId, date, editTask, editEvent }: Readonly<UseDashboardDndProps>) {
  const { toast } = useToast();
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

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setDraggedTask(null);
      setDraggedEventTitle(null);

      if (!over || !userId) return;

      const targetTime = over.data?.current?.time || String(over.id);
      if (!targetTime || typeof targetTime !== "string" || !targetTime.includes(":")) return;

      const dragId = String(active.id);
      const [hours, minutes] = targetTime.split(":").map(Number);
      if (Number.isNaN(hours)) return;
      const label = formatHm(hours, minutes || 0);

      if (dragId.startsWith("plan-task-") || dragId.startsWith("task-")) {
        const rawId = dragId.replace("plan-task-", "").replace("task-", "");
        const currentTask = tasks.find((t) => String(t.id) === rawId);
        if (!currentTask) return;
        // Upuszczenie w tym samym slocie godzinowym = brak zmiany.
        if (currentTask.scheduled_time && hourOf(currentTask.scheduled_time) === hours) return;

        const ok = await toast.confirm(`Przenieść „${currentTask.title}” na ${label}?`, MOVE_CONFIRM_OPTIONS);
        if (!ok) return;

        const previousTime = currentTask.scheduled_time ?? null;
        const scheduledDateTime = new Date(date);
        scheduledDateTime.setHours(hours, minutes || 0, 0, 0);

        const saved = await editTask(
          { ...currentTask, scheduled_time: dateToTimestamp(scheduledDateTime) },
          { silent: true }
        );
        if (!saved) return;
        toast.success(`Przeniesiono „${currentTask.title}” na ${label}`, {
          durationMs: UNDO_WINDOW_MS,
          action: {
            label: "Cofnij",
            onClick: () => {
              const latest = tasksRef.current.find((t) => String(t.id) === rawId) ?? currentTask;
              void editTask({ ...latest, scheduled_time: previousTime }, { silent: true }).then((undone) => {
                if (undone) toast.success("Cofnięto przeniesienie");
              });
            },
          },
        });
        return;
      }

      if (dragId.startsWith("plan-event-") || dragId.startsWith("side-event-")) {
        const eventId = dragId.replace("plan-event-", "").replace("side-event-", "");
        const currentEvent = events.find((e) => String(e.id) === eventId);
        if (!currentEvent) return;
        if (hourOf(currentEvent.start_time) === hours) return;

        // parseEventDate rozumie zapis „…+00” z dateToTimestamp (optymistyczny stan po 1. przesunięciu);
        // new Date("…T10:00:00+00") zwraca Invalid Date → NaN w zapisie → błąd przy 2. przesunięciu.
        const oldStart = parseEventDate(currentEvent.start_time);
        const oldEnd = parseEventDate(currentEvent.end_time);
        const durationMs = oldEnd.getTime() - oldStart.getTime();
        if (Number.isNaN(durationMs)) {
          toast.error("Nieprawidłowy czas wydarzenia.");
          return;
        }

        const ok = await toast.confirm(`Przenieść „${currentEvent.title}” na ${label}?`, MOVE_CONFIRM_OPTIONS);
        if (!ok) return;

        const previous = { start_time: currentEvent.start_time, end_time: currentEvent.end_time };
        const newStart = new Date(date);
        newStart.setHours(hours, minutes || 0, 0, 0);
        const newEnd = new Date(newStart.getTime() + durationMs);

        const saved = await editEvent(
          {
            ...currentEvent,
            start_time: dateToTimestamp(newStart),
            end_time: dateToTimestamp(newEnd),
          },
          { silent: true }
        );
        if (!saved) return;
        toast.success(`Przeniesiono „${currentEvent.title}” na ${label}`, {
          durationMs: UNDO_WINDOW_MS,
          action: {
            label: "Cofnij",
            onClick: () => {
              const latest = eventsRef.current.find((e) => String(e.id) === eventId) ?? currentEvent;
              void editEvent({ ...latest, ...previous }, { silent: true }).then((undone) => {
                if (undone) toast.success("Cofnięto przeniesienie");
              });
            },
          },
        });
      }
    },
    [userId, tasks, events, date, editTask, editEvent, toast, tasksRef, eventsRef]
  );

  return { draggedTask, draggedEventTitle, handleDragStart, handleDragEnd };
}
