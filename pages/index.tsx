import React, { useMemo, useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import { useTasks } from "../hooks/useTasks";
import { useEvents } from "../hooks/useEvents";
import { useStreaks } from "../hooks/useStreaks";
import { useDaySchemas } from "../hooks/useDaySchemas";
import { Calendar } from "lucide-react";
import { Task } from "../types";
import { dateToTimestamp } from "../lib/dateUtils";

import { 
  DndContext, DragEndEvent, DragStartEvent, useSensor, useSensors, 
  PointerSensor, TouchSensor, DragOverlay, defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { useSettings } from "../hooks/useSettings";
import LoadingState from "../components/LoadingState";

import { DraggingTaskItem, DraggingEventItem } from "../components/dashboard/DraggingItem";
import { PlanItem } from "../components/dashboard/PlanItem";
import { DraggablePlanItem } from "../components/dashboard/DraggablePlanItem";
import { useRouter } from "next/router";
import { useAuth } from "../providers/AuthProvider";

// Importy naszych podzielonych komponentów (upewnij się że ścieżki się zgadzają)
import { DashboardWidgets } from "../components/widgets/DashboardWidgets";
import { MilestonesList } from "../components/dashboard/MilestonesList";
import { DailyPlan } from "../components/dashboard/DailyPlan";
import { UnscheduledTasks } from "../components/dashboard/UnscheduledTasks";

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 - 23:00

export default function DashboardPage() {
  const { user, loadingUser } = useAuth();
  const userId = user?.id;
  const router = useRouter();

  useEffect(() => {
    if (!user && !loadingUser) {
      router.push("/start");
    }
  }, [user, loadingUser, router]);

  const [isMounted, setIsMounted] = useState(false);
  
  const todayDate = new Date();
  const todayString = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
  const currentDayOfWeek = todayDate.getDay();

  const { tasks, loading: tasksLoading, fetchTasks, setDoneTask, deleteTask, editTask } = useTasks("", todayString);
  const { events, deleteEvent, fetchEvents, editEvent } = useEvents(todayString, todayString); 
  const { streaks, getMilestoneMessage } = useStreaks();
  const { schemas } = useDaySchemas();
  const { settings, loading: loadingSettings } = useSettings();

  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [draggedEventTitle, setDraggedEventTitle] = useState<string | null>(null);

  const homepageStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Dzisiaj v3",
    description: "Kompleksowa aplikacja do zarządzania czasem i produktywnością.",
    url: "https://dzisiajv3.vercel.app",
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (!draggedTask && !draggedEventTitle) return;
    let animationFrameId: number;
    const scrollSpeed = 10;
    const edgeThreshold = 100;

    const autoScroll = () => {
      const mouseY = (window as any).lastMouseY || 0;
      const windowHeight = window.innerHeight;
      if (mouseY > windowHeight - edgeThreshold) window.scrollBy(0, scrollSpeed);
      else if (mouseY < edgeThreshold) window.scrollBy(0, -scrollSpeed);
      animationFrameId = requestAnimationFrame(autoScroll);
    };

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (e instanceof MouseEvent) (window as any).lastMouseY = e.clientY;
      else if (e instanceof TouchEvent && e.touches.length > 0) (window as any).lastMouseY = e.touches[0].clientY;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleMouseMove);
    animationFrameId = requestAnimationFrame(autoScroll);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      delete (window as any).lastMouseY;
    };
  }, [draggedTask, draggedEventTitle]);

  const activeTasks = useMemo(() => tasks.filter(t => t.status === 'pending' || t.status === 'accepted'), [tasks]);
  const scheduledTasks = useMemo(() => activeTasks.filter(t => t.scheduled_time), [activeTasks]);

  const allDayEvents = useMemo(() => events.map(event => ({
    id: event.id,
    title: event.title,
    type: 'event' as const,
    color: 'bg-card border border-gray-200 dark:border-gray-800 shadow-sm text-text',
    data: event
  })), [events]);

  const planByHour = useMemo(() => {
    const map: Record<string, any[]> = {};
    HOURS.forEach(h => map[`${String(h).padStart(2, '0')}:00`] = []);

    const todaySchema = schemas.find(s => s.days && s.days.includes(currentDayOfWeek));
    if (todaySchema?.entries) {
      todaySchema.entries.forEach((entry, idx) => {
        const [h] = entry.time.split(':');
        const hourKey = `${h.padStart(2, '0')}:00`;
        if (map[hourKey]) map[hourKey].push({ id: `schema-${idx}`, title: entry.label, type: 'schema', color: 'bg-surface border border-dashed border-gray-200 dark:border-gray-700 text-textSecondary' });
      });
    }

    events.forEach(event => {
      const timeStr = `${event.start_time.replace(" ", "T").split('T')[1].split(':')[0].padStart(2, '0')}:00`;
      if (map[timeStr]) map[timeStr].push({ id: event.id, title: event.title, type: 'event', color: 'bg-card border border-gray-200 dark:border-gray-800 shadow-sm text-text', data: event });
    });

    scheduledTasks.forEach(task => {
      if (task.scheduled_time) {
        const timeStr = `${task.scheduled_time.replace(" ", "T").split('T')[1].split(':')[0].padStart(2, '0')}:00`;
        if (map[timeStr]) map[timeStr].push({ id: String(task.id), title: task.title, type: 'task', color: 'bg-card border border-gray-200 dark:border-gray-800 shadow-sm text-text', data: task });
      }
    });

    return map;
  }, [schemas, events, scheduledTasks, currentDayOfWeek]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const dragId = String(event.active.id);
    if (dragId.startsWith('task-')) {
      const task = tasks.find(t => String(t.id) === dragId.replace('task-', ''));
      if (task) setDraggedTask(task);
    } else if (dragId.startsWith('plan-task-')) {
      const task = tasks.find(t => String(t.id) === dragId.replace('plan-task-', ''));
      if (task) setDraggedTask(task);
    } else if (dragId.startsWith('plan-event-')) {
      const evt = events.find(e => String(e.id) === dragId.replace('plan-event-', ''));
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
      } catch (err) { console.error("Error scheduling task:", err); }
    } else if (dragId.startsWith('plan-event-')) {
      const eventId = dragId.replace('plan-event-', '');
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
      } catch (err) { console.error("Error rescheduling event:", err); }
    }
  }, [userId, tasks, events, todayDate, editTask, editEvent, fetchTasks, fetchEvents]);

  // Ujednolicone wrappery operacji
  const handleRemoveFromSchedule = useCallback(async (taskId: string) => {
    const currentTask = tasks.find(t => String(t.id) === String(taskId));
    if (currentTask) {
      await editTask({ ...currentTask, scheduled_time: null });
      await fetchTasks();
    }
  }, [tasks, editTask, fetchTasks]);

  const handleMarkAsDone = useCallback(async (taskId: string) => {
    await setDoneTask(String(taskId));
    await fetchTasks();
  }, [setDoneTask, fetchTasks]);

  const handleDeleteTaskWrapper = useCallback(async (taskId: string) => {
    await deleteTask(taskId);
    await fetchTasks();
  }, [deleteTask, fetchTasks]);

  if (!isMounted || loadingSettings) return <LoadingState />;

  return (
    <>
    <SEO title="Dzisiaj v3 - Zarządzaj Zadaniami, Notatkami i Kalendarzem" structuredData={homepageStructuredData} />
    <Layout>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="space-y-4 sm:space-y-6 mx-auto">
          
          <DashboardWidgets settings={settings} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <DailyPlan 
              planByHour={planByHour} 
              handleMarkAsDone={handleMarkAsDone} 
              handleDeleteTask={handleDeleteTaskWrapper}
              handleRemoveFromSchedule={handleRemoveFromSchedule} 
              handleDeleteEvent={deleteEvent} 
            />
            
            <div className="lg:col-span-1 space-y-6">
              {allDayEvents.length > 0 && (
                <section className="bg-card border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                    <Calendar className="text-blue-500 w-5 h-5" /> Wydarzenia
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {allDayEvents.map((item) => (
                      <DraggablePlanItem key={`right-plan-event-${item.id}`} id={`plan-event-${item.id}`} type="event">
                        <PlanItem item={item} onMarkAsDoneTask={handleMarkAsDone} onDeleteTask={handleDeleteTaskWrapper} onRemoveFromSchedule={handleRemoveFromSchedule} onDeleteEvent={deleteEvent} />
                      </DraggablePlanItem>
                    ))}
                  </div>
                </section>
              )}

              <UnscheduledTasks 
                tasksLoading={tasksLoading} 
                activeTasks={activeTasks} 
                handleMarkAsDone={handleMarkAsDone}
                handleDeleteTask={handleDeleteTaskWrapper}
                handleRemoveFromSchedule={handleRemoveFromSchedule}
                handleDeleteEvent={deleteEvent}
              />
              
              <MilestonesList streaks={streaks} getMilestoneMessage={getMilestoneMessage} />
            </div>
          </div>
        </div>

        <DragOverlay style={{ touchAction: 'none' }} dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
          {draggedTask ? <DraggingTaskItem task={draggedTask} /> : draggedEventTitle ? (<DraggingEventItem title={draggedEventTitle}/>) : null}
        </DragOverlay>
      </DndContext>
    </Layout>
    </>
  );
}

DashboardPage.auth = true;