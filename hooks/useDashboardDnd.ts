// hooks/useDashboardDnd.ts

import { useState, useCallback } from "react";
import { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { Task } from "@/types/tasks";
import { Event } from "@/types/events";
import { dateToTimestamp } from "@/lib/dateUtils";
import { useToast } from "@/providers/ToastProvider";

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

export function useDashboardDnd({ tasks, events, userId, date, editTask, editEvent }: Readonly<UseDashboardDndProps>) {
  const { toast } = useToast();
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [draggedEventTitle, setDraggedEventTitle] = useState<string | null>(null);

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

      if (dragId.startsWith("plan-task-") || dragId.startsWith("task-")) {
        const rawId = dragId.replace("plan-task-", "").replace("task-", "");
        const currentTask = tasks.find((t) => String(t.id) === rawId);
        if (!currentTask) return;

        const scheduledDateTime = new Date(date);
        scheduledDateTime.setHours(hours, minutes || 0, 0, 0);

        const ok = await editTask(
          { ...currentTask, scheduled_time: dateToTimestamp(scheduledDateTime) },
          { silent: true }
        );
        if (ok) toast.success(`Przeniesiono „${currentTask.title}” na ${formatHm(hours, minutes || 0)}`);
        return;
      }

      if (dragId.startsWith("plan-event-") || dragId.startsWith("side-event-")) {
        const eventId = dragId.replace("plan-event-", "").replace("side-event-", "");
        const currentEvent = events.find((e) => String(e.id) === eventId);
        if (!currentEvent) return;

        const oldStart = new Date(currentEvent.start_time.replace(" ", "T"));
        const oldEnd = new Date(currentEvent.end_time.replace(" ", "T"));
        const durationMs = oldEnd.getTime() - oldStart.getTime();

        const newStart = new Date(date);
        newStart.setHours(hours, minutes || 0, 0, 0);
        const newEnd = new Date(newStart.getTime() + durationMs);

        const ok = await editEvent(
          {
            ...currentEvent,
            start_time: dateToTimestamp(newStart),
            end_time: dateToTimestamp(newEnd),
          },
          { silent: true }
        );
        if (ok) toast.success(`Przeniesiono „${currentEvent.title}” na ${formatHm(hours, minutes || 0)}`);
      }
    },
    [userId, tasks, events, date, editTask, editEvent, toast]
  );

  return { draggedTask, draggedEventTitle, handleDragStart, handleDragEnd };
}
