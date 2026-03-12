import { useState, useCallback } from 'react';
import { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { Task } from '../types';
import { dateToTimestamp } from '../lib/dateUtils';

interface UseDashboardDndProps {
  tasks: Task[];
  events: any[]; 
  userId: string | undefined;
  todayDate: Date;
  editTask: (task: any) => Promise<void>;
  editEvent: (event: any) => Promise<void>;
  fetchTasks: () => Promise<Task[]>;
  fetchEvents: () => Promise<void>;
}

export const useDashboardDnd = ({
  tasks,
  events,
  userId,
  todayDate,
  editTask,
  editEvent,
  fetchTasks,
  fetchEvents
}: UseDashboardDndProps) => {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [draggedEventTitle, setDraggedEventTitle] = useState<string | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const dragId = String(event.active.id);
    
    if (dragId.startsWith('task-')) {
      const task = tasks.find(t => String(t.id) === dragId.replace('task-', ''));
      if (task) setDraggedTask(task);
    } else if (dragId.startsWith('plan-task-')) {
      const task = tasks.find(t => String(t.id) === dragId.replace('plan-task-', ''));
      if (task) setDraggedTask(task);
    } else if (dragId.startsWith('plan-event-') || dragId.startsWith('side-event-')) {
      const rawId = dragId.replace('plan-event-', '').replace('side-event-', '');
      const evt = events.find(e => String(e.id) === rawId);
      if (evt) setDraggedEventTitle(evt.title);
    }
  }, [tasks, events]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedTask(null); 
    setDraggedEventTitle(null);
    if (!over || !userId) return;

    const targetTime = over.data?.current?.time || String(over.id);
    if (!targetTime || typeof targetTime !== 'string' || !targetTime.includes(':')) return;

    const dragId = String(active.id);
    const [hours, minutes] = targetTime.split(':').map(Number);

    let taskId = dragId.startsWith('plan-task-') ? dragId.replace('plan-task-', '') : (dragId.startsWith('task-') ? dragId.replace('task-', '') : null);

    if (taskId) {
      const currentTask = tasks.find(t => String(t.id) === String(taskId));
      if (!currentTask) return;
      const scheduledDateTime = new Date(todayDate);
      scheduledDateTime.setHours(hours, minutes || 0, 0, 0);
      try {
        await editTask({ ...currentTask, scheduled_time: dateToTimestamp(scheduledDateTime) });
        await fetchTasks();
      } catch (err) { console.error("Błąd planowania zadania:", err); }
      
    } else if (dragId.startsWith('plan-event-') || dragId.startsWith('side-event-')) {
      const eventId = dragId.replace('plan-event-', '').replace('side-event-', '');
      const currentEvent = events.find(e => String(e.id) === String(eventId));
      
      if (!currentEvent) return;
      const oldStart = new Date(currentEvent.start_time.replace(" ", "T"));
      const oldEnd = new Date(currentEvent.end_time.replace(" ", "T"));
      const durationMs = oldEnd.getTime() - oldStart.getTime();

      const newStart = new Date(todayDate);
      newStart.setHours(hours, minutes || 0, 0, 0);
      const newEnd = new Date(newStart.getTime() + durationMs);

      try {
        await editEvent({ ...currentEvent, start_time: dateToTimestamp(newStart), end_time: dateToTimestamp(newEnd) });
        await fetchEvents();
      } catch (err) { console.error("Błąd planowania wydarzenia:", err); }
    }
  }, [userId, tasks, events, todayDate, editTask, editEvent, fetchTasks, fetchEvents]);

  return {
    draggedTask,
    draggedEventTitle,
    handleDragStart,
    handleDragEnd
  };
};