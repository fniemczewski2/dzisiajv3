// hooks/useDashboardDnd.ts
import { useState, useCallback } from "react";
import { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { Task } from "../types";
import { dateToTimestamp } from "../lib/dateUtils";

interface UseDashboardDndProps {
  tasks: Task[];
  events: any[];
  userId: string | undefined;
  date: Date;
  editTask: (task: any) => Promise<void>;
  editEvent: (event: any) => Promise<void>;
  fetchTasks: () => Promise<Task[]>;
  fetchEvents: () => Promise<void>;
}

export function useDashboardDnd({
  tasks,
  events,
  userId,
  date,
  editTask,
  editEvent,
  fetchTasks,
  fetchEvents,
}: UseDashboardDndProps) {
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

      if (dragId.startsWith("plan-task-") || dragId.startsWith("task-")) {
        const rawId = dragId.replace("plan-task-", "").replace("task-", "");
        const currentTask = tasks.find((t) => String(t.id) === rawId);
        if (!currentTask) return;

        const scheduledDateTime = new Date(date);
        scheduledDateTime.setHours(hours, minutes || 0, 0, 0);

        await editTask({ ...currentTask, scheduled_time: dateToTimestamp(scheduledDateTime) });
        await fetchTasks();
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

        await editEvent({
          ...currentEvent,
          start_time: dateToTimestamp(newStart),
          end_time: dateToTimestamp(newEnd),
        });
        await fetchEvents();
      }
    },
    [userId, tasks, events, date, editTask, editEvent, fetchTasks, fetchEvents]
  );

  return { draggedTask, draggedEventTitle, handleDragStart, handleDragEnd };
}