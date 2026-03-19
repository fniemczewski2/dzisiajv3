// pages/index.tsx

import React, {
  useMemo, useState, useEffect, useCallback, useRef,
} from "react";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import { useTasks } from "../hooks/useTasks";
import { useEvents } from "../hooks/useEvents";
import { useStreaks } from "../hooks/useStreaks";
import { useDaySchemas } from "../hooks/useDaySchemas";
import { useSettings } from "../hooks/useSettings";
import { useAuth } from "../providers/AuthProvider";
import { useDashboardDnd } from "../hooks/useDashboardDnd";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";

import LoadingState from "../components/LoadingState";
import { DraggingTaskItem, DraggingEventItem } from "../components/dashboard/DraggingItem";
import { PlanItem } from "../components/dashboard/PlanItem";
import { DraggablePlanItem } from "../components/dashboard/DraggablePlanItem";
import { useRouter } from "next/router";

import { DashboardWidgets } from "../components/widgets/DashboardWidgets";
import { MilestonesList } from "../components/dashboard/MilestonesList";
import { DailyPlan } from "../components/dashboard/DailyPlan";
import { UnscheduledTasks } from "../components/dashboard/UnscheduledTasks";
import { AddButton } from "../components/CommonButtons";

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); 

export default function DashboardPage() {
  const { user, loadingUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingUser && !user) {
      router.replace("/start");
    }
  }, [user, loadingUser, router]);

  if (loadingUser) return <LoadingState fullScreen />;
  if (!user)       return null;

  return <DashboardContent />;
}

function DashboardContent() {
  const { user } = useAuth();
  const userId = user!.id;
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);

  const todayDate   = useMemo(() => new Date(), []);
  const todayString = useMemo(() => format(todayDate, "yyyy-MM-dd"), [todayDate]);
  const currentDayOfWeek = (todayDate.getDay() + 6) % 7;
  console.log(currentDayOfWeek)

  const {
    tasks,
    loading: tasksLoading,
    fetchTasks,
    setDoneTask,
    deleteTask,
    editTask,
  } = useTasks(todayString, todayString);

  const { events, deleteEvent, fetchEvents, editEvent } = useEvents(
    todayString,
    todayString
  );

  const { streaks, getMilestoneMessage } = useStreaks();
  const { schemas } = useDaySchemas();
  const { settings, loading: loadingSettings } = useSettings();

  const { draggedTask, draggedEventTitle, handleDragStart, handleDragEnd } =
    useDashboardDnd({
      tasks,
      events,
      userId,
      todayDate,
      editTask,
      editEvent,
      fetchTasks,
      fetchEvents,
    });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  useEffect(() => setIsMounted(true), []);

  const lastMouseY = useRef<number>(0);

  useEffect(() => {
    if (!draggedTask && !draggedEventTitle) return;

    let animationFrameId: number;
    const scrollSpeed    = 10;
    const edgeThreshold  = 100;

    const autoScroll = () => {
      const y = lastMouseY.current;
      const h = window.innerHeight;
      if      (y > h - edgeThreshold) window.scrollBy(0,  scrollSpeed);
      else if (y <     edgeThreshold) window.scrollBy(0, -scrollSpeed);
      animationFrameId = requestAnimationFrame(autoScroll);
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (e instanceof MouseEvent)       lastMouseY.current = e.clientY;
      else if (e.touches.length > 0)     lastMouseY.current = e.touches[0].clientY;
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("touchmove", handleMove);
    animationFrameId = requestAnimationFrame(autoScroll);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("touchmove", handleMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [draggedTask, draggedEventTitle]);

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status === "pending" || t.status === "accepted"),
    [tasks]
  );

  const scheduledTasks = useMemo(
    () => activeTasks.filter((t) => t.scheduled_time),
    [activeTasks]
  );

  const allDayEvents = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        title: event.title,
        type: "event" as const,
        color: "card shadow-sm text-text",
        data: event,
      })),
    [events]
  );

  const planByHour = useMemo(() => {
    const map: Record<string, unknown[]> = {};
    HOURS.forEach((h) => { map[`${String(h).padStart(2, "0")}:00`] = []; });

    const todaySchema = schemas.find((s) => s.days?.includes(currentDayOfWeek));
    if (todaySchema?.entries) {
      todaySchema.entries.forEach((entry, idx) => {
        const [h] = entry.time.split(":");
        const key = `${h.padStart(2, "0")}:00`;
        if (map[key]) {
          (map[key] as unknown[]).push({
            id: `schema-${idx}`,
            title: entry.label,
            type: "schema",
            color: "bg-surface border border-dashed border-gray-200 dark:border-gray-700 text-textSecondary",
          });
        }
      });
    }

    events.forEach((event) => {
      const h = event.start_time.replace(" ", "T").split("T")[1].split(":")[0].padStart(2, "0");
      const key = `${h}:00`;
      if (map[key]) {
        (map[key] as unknown[]).push({
          id: event.id,
          title: event.title,
          type: "event",
          color: "card shadow-sm text-text",
          data: event,
        });
      }
    });

    scheduledTasks.forEach((task) => {
      if (!task.scheduled_time) return;
      const h = task.scheduled_time.replace(" ", "T").split("T")[1].split(":")[0].padStart(2, "0");
      const key = `${h}:00`;
      if (map[key]) {
        (map[key] as unknown[]).push({
          id: String(task.id),
          title: task.title,
          type: "task",
          color: "card shadow-sm text-text",
          data: task,
        });
      }
    });

    return map;
  }, [schemas, events, scheduledTasks, currentDayOfWeek]);

  const handleRemoveFromSchedule = useCallback(
    async (taskId: string) => {
      const current = tasks.find((t) => String(t.id) === String(taskId));
      if (current) {
        await editTask({ ...current, scheduled_time: null });
        await fetchTasks();
      }
    },
    [tasks, editTask, fetchTasks]
  );

  const handleMarkAsDone = useCallback(
    async (taskId: string) => {
      await setDoneTask(String(taskId));
      await fetchTasks();
    },
    [setDoneTask, fetchTasks]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      await deleteTask(taskId);
      await fetchTasks();
    },
    [deleteTask, fetchTasks]
  );

  if (!isMounted || loadingSettings) return <LoadingState fullScreen/>;

  const homepageStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Dzisiaj v3",
    description: "Kompleksowa aplikacja do zarządzania czasem i produktywnością.",
    url: "https://dzisiajv3.vercel.app",
  };

  return (
    <>
      <SEO
        title="Dzisiaj v3 - Zarządzaj Zadaniami, Notatkami i Kalendarzem"
        structuredData={homepageStructuredData}
      />
      <Layout>
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-4 sm:space-y-6 mx-auto">
            <DashboardWidgets settings={settings} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <DailyPlan
                planByHour={planByHour}
                handleMarkAsDone={handleMarkAsDone}
                handleDeleteTask={handleDeleteTask}
                handleRemoveFromSchedule={handleRemoveFromSchedule}
                handleDeleteEvent={deleteEvent}
              />

              <div className="lg:col-span-1 space-y-6">
                {allDayEvents.length > 0 && (
                  <section className="card rounded-xl p-5 sm:p-6 shadow-sm">
                    <div className="flex flex-nowrap justify-between mb-5">
                      <h2 className="text-lg font-bold text-text mb-1 flex items-center gap-2">
                        <Calendar className="text-primary w-5 h-5" /> Wydarzenia
                      </h2>
                      <AddButton
                        onClick={() => router.push("/calendar?action=add")}
                        type="button"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {allDayEvents.map((item) => (
                        <DraggablePlanItem
                          key={`side-event-${item.id}`}
                          id={`side-event-${item.id}`}
                          type="event"
                        >
                          <PlanItem
                            item={item}
                            onMarkAsDoneTask={handleMarkAsDone}
                            onRemoveFromSchedule={handleRemoveFromSchedule}
                          />
                        </DraggablePlanItem>
                      ))}
                    </div>
                  </section>
                )}

                <UnscheduledTasks
                  tasksLoading={tasksLoading}
                  activeTasks={activeTasks}
                  handleMarkAsDone={handleMarkAsDone}
                  handleDeleteTask={handleDeleteTask}
                  handleRemoveFromSchedule={handleRemoveFromSchedule}
                  handleDeleteEvent={deleteEvent}
                />

                <MilestonesList
                  streaks={streaks}
                  getMilestoneMessage={getMilestoneMessage}
                />
              </div>
            </div>
          </div>

          <DragOverlay
            style={{ touchAction: "none" }}
            dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                styles: { active: { opacity: "0.5" } },
              }),
            }}
          >
            {draggedTask ? (
              <DraggingTaskItem title={draggedTask.title} />
            ) : draggedEventTitle ? (
              <DraggingEventItem title={draggedEventTitle} />
            ) : null}
          </DragOverlay>
        </DndContext>
      </Layout>
    </>
  );
}

DashboardPage.auth = true;