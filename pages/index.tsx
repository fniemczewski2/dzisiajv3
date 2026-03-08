import React, { useMemo, useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import { useTasks } from "../hooks/useTasks";
import { useEvents } from "../hooks/useEvents";
import { useDaySchemas } from "../hooks/useDaySchemas";
import TaskIcons from "../components/tasks/TaskIcons";
import { ListTodo, Calendar, GripVertical } from "lucide-react";
import { Task } from "../types";
import { dateToTimestamp } from "../lib/dateUtils";

// --- DND IMPORTS ---
import { 
  DndContext, 
  DragEndEvent,
  DragStartEvent,
  useSensor, 
  useSensors, 
  PointerSensor,
  TouchSensor,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import WaterTracker from "../components/tasks/WaterTracker";
import { useSettings } from "../hooks/useSettings";
import LoadingState from "../components/LoadingState";
import DailySpendingForm from "../components/bills/DailySpendingForm";

// Import separated components
import { StaticTaskItem } from "../components/dashboard/StaticTaskItem";
import DraggableTask from "../components/dashboard/DraggableTask";
import { DroppableHourSlot } from "../components/dashboard/DroppableHourSlot";
import { PlanItem } from "../components/dashboard/PlanItem";
import TransportWidget from "../components/transport/TransportWidget";
import { useRouter } from "next/router";
import { useAuth } from "../providers/AuthProvider";

// --- CONSTANTS ---
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 - 23:00

export default function DashboardPage() {
  const { user, loadingUser, supabase } = useAuth();
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

  const { tasks, loading: tasksLoading, fetchTasks, setDoneTask } = useTasks("", todayString);
  const { events, deleteEvent } = useEvents(todayString, todayString); 
  const { schemas } = useDaySchemas();
  const { settings, loading: loadingSettings } = useSettings();

  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const homepageStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Dzisiaj v3",
    description: "Kompleksowa aplikacja do zarządzania czasem i produktywnością. Organizuj zadania, notatki, rachunki i kalendarz w jednym miejscu.",
    url: "https://dzisiajv3.vercel.app",
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web Browser, iOS, Android",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    softwareVersion: "3.0",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "PLN",
    },
    featureList: [
      "Zarządzanie zadaniami z priorytetami",
      "Kalendarz wydarzeń",
      "Notatki i listy",
      "Śledzenie rachunków i budżetu",
      "Technika Pomodoro",
      "Macierz Eisenhowera",
      "Tryb offline (PWA)",
      "Synchronizacja w chmurze",
    ],
    screenshot: "https://dzisiajv3.vercel.app/screenshot.png",
    author: {
      "@type": "Organization",
      name: "Dzisiaj v3",
    },
    inLanguage: "pl-PL",
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, 
        tolerance: 5, 
      },
    })
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-scroll during drag
  useEffect(() => {
    if (!draggedTask) return;

    let animationFrameId: number;
    const scrollSpeed = 10;
    const edgeThreshold = 100;

    const autoScroll = () => {
      const mouseY = (window as any).lastMouseY || 0;
      const windowHeight = window.innerHeight;
      
      if (mouseY > windowHeight - edgeThreshold) {
        window.scrollBy(0, scrollSpeed);
      } else if (mouseY < edgeThreshold) {
        window.scrollBy(0, -scrollSpeed);
      }

      animationFrameId = requestAnimationFrame(autoScroll);
    };

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (e instanceof MouseEvent) {
        (window as any).lastMouseY = e.clientY;
      } else if (e instanceof TouchEvent && e.touches.length > 0) {
        (window as any).lastMouseY = e.touches[0].clientY;
      }
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
  }, [draggedTask]);

  const activeTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'pending' || t.status === 'accepted');
  }, [tasks]);

  const scheduledTasks = useMemo(() => {
    return activeTasks.filter(t => t.scheduled_time);
  }, [activeTasks]);

  // Czyste karty dla wydarzeń całodniowych
  const allDayEvents = useMemo(() => {
    return events.map(event => ({
      id: event.id,
      title: event.title,
      type: 'event' as const,
      color: 'bg-card border border-gray-200 dark:border-gray-800 shadow-sm text-text',
      data: event
    }));
  }, [events]);

  const planByHour = useMemo(() => {
    const map: Record<string, Array<{ 
      id: string; 
      title: string; 
      type: 'event' | 'schema' | 'task'; 
      color: string;
      data?: any;
    }>> = {};
    
    HOURS.forEach(h => {
      const timeStr = `${String(h).padStart(2, '0')}:00`;
      map[timeStr] = [];
    });

    const todaySchema = schemas.find(s => s.days && s.days.includes(currentDayOfWeek));
    if (todaySchema?.entries) {
      todaySchema.entries.forEach((entry, idx) => {
        const [h] = entry.time.split(':');
        const hourKey = `${h.padStart(2, '0')}:00`;
        if (map[hourKey]) {
          map[hourKey].push({
            id: `schema-${idx}`,
            title: entry.label,
            type: 'schema',
            color: 'bg-surface border border-dashed border-gray-200 dark:border-gray-700 text-textSecondary'
          });
        }
      });
    }

    events.forEach(event => {
      const cleanStart = event.start_time.replace(" ", "T");
      const timePart = cleanStart.split('T')[1];
      const hoursOnly = timePart.split(':')[0];
      const timeStr = `${hoursOnly.padStart(2, '0')}:00`;

      if (map[timeStr]) {
        map[timeStr].push({
          id: event.id,
          title: event.title,
          type: 'event',
          color: 'bg-card border border-gray-200 dark:border-gray-800 shadow-sm text-text',
          data: event
        });
      }
    });

    scheduledTasks.forEach(task => {
      if (task.scheduled_time) {
        const cleanStart = task.scheduled_time.replace(" ", "T");
        const timePart = cleanStart.split('T')[1];
        const hoursOnly = timePart.split(':')[0];
        const timeStr = `${hoursOnly.padStart(2, '0')}:00`;
        
        if (map[timeStr]) {
          map[timeStr].push({
            id: String(task.id),
            title: task.title,
            type: 'task',
            color: 'bg-card border border-gray-200 dark:border-gray-800 shadow-sm text-text',
            data: task
          });
        }
      }
    });

    return map;
  }, [schemas, events, scheduledTasks, currentDayOfWeek]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const dragId = String(event.active.id);
    let task: Task | undefined;
    
    if (dragId.startsWith('scheduled-task-')) {
      const taskId = dragId.replace('scheduled-task-', '');
      task = tasks.find(t => String(t.id) === String(taskId));
    } else if (dragId.startsWith('task-')) {
      const taskId = dragId.replace('task-', '');
      task = tasks.find(t => String(t.id) === String(taskId));
    }
    
    if (task) {
      setDraggedTask(task);
    }
  }, [tasks]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedTask(null); 
    
    if (!over || !userId) return;

    const targetTime = over.data.current?.time;
    if (!targetTime) return;

    const dragId = String(active.id);
    let taskId: string;
    
    if (dragId.startsWith('scheduled-task-')) {
      taskId = dragId.replace('scheduled-task-', '');
    } else if (dragId.startsWith('task-')) {
      taskId = dragId.replace('task-', '');
    } else {
      return;
    }
    
    const currentTask = tasks.find(t => String(t.id) === String(taskId));
    if (!currentTask) return;

    const [hours, minutes] = targetTime.split(':').map(Number);
    const scheduledDateTime = new Date(todayDate);
    scheduledDateTime.setHours(hours, minutes || 0, 0, 0);

    const timestampString = dateToTimestamp(scheduledDateTime);

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ scheduled_time: timestampString })
        .eq('id', taskId);

      if (error) {
        console.error("Error scheduling task:", error);
        return;
      }

      await fetchTasks();
    } catch (err) {
      console.error("Critical error scheduling task:", err);
    }
  }, [userId, tasks, todayDate, supabase, fetchTasks]);

  const handleRemoveFromSchedule = useCallback(async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ scheduled_time: null })
        .eq('id', taskId);

      if (error) {
        console.error("Error removing task from schedule:", error);
        return;
      }

      await fetchTasks();
    } catch (err) {
      console.error("Error removing task from schedule:", err);
    }
  }, [supabase, fetchTasks]);

  const handleMarkAsDone = useCallback(async (taskId: string) => {
    try {
      await setDoneTask(String(taskId));
      await fetchTasks();
    } catch (err) {
      console.error("Error marking task as done:", err);
    }
  }, [setDoneTask, fetchTasks]);

  if (!isMounted || loadingSettings) return <LoadingState />;

  return (
    <>
    <SEO          
          title="Dzisiaj v3 - Zarządzaj Zadaniami, Notatkami i Kalendarzem"
          description="Dzisiaj v3 to kompleksowa aplikacja do zarządzania czasem i produktywnością. Organizuj zadania z technikami Pomodoro i Eisenhower, twórz notatki, śledź rachunki i planuj w kalendarzu. Wszystko w jednym miejscu, offline i online."
          canonical="https://dzisiajv3.vercel.app"
          ogType="website"
          keywords="zarządzanie zadaniami, produktywność, notatki, kalendarz, pomodoro, eisenhower matrix, organizacja czasu, todo list, planner, budżet domowy, rachunki, pwa"
          structuredData={homepageStructuredData}
      />
    <Layout>
      
      <DndContext 
        id="dashboard-dnd"
        sensors={sensors} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4 sm:space-y-6 mx-auto">

          {/* Szybkie widżety */}
          <div className="flex flex-col">
            {settings?.show_habits && <TaskIcons />}
            {settings?.show_water_tracker && <WaterTracker />}
            <DailySpendingForm/>
            <TransportWidget />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEWA KOLUMNA - Plan Dnia */}
            <section className="lg:col-span-2 bg-card border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm">
              <h2 className="text-xl font-bold text-text mb-6 flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Calendar className="text-primary w-5 h-5" /> 
                </div>
                Twój Plan Dnia
              </h2>
              
              <div className="relative pl-1">
                {/* Linia osi czasu */}
                <div className="absolute left-[1.8rem] top-4 bottom-4 w-[2px] bg-gray-200 dark:bg-gray-800 z-0 rounded-full"></div>
                
                <div className="space-y-2 relative z-10">
                  {HOURS.map((h) => {
                    const timeKey = `${String(h).padStart(2, '0')}:00`;
                    const items = planByHour[timeKey] || [];

                    return (
                      <DroppableHourSlot key={timeKey} time={timeKey}>
                        {items.map((item, idx) => (
                          <PlanItem
                            key={`${item.id}-${idx}`}
                            item={item}
                            onMarkAsDone={handleMarkAsDone}
                            onRemoveFromSchedule={handleRemoveFromSchedule}
                            onDeleteEvent={deleteEvent}
                          />
                        ))}
                      </DroppableHourSlot>
                    );
                  })}
                </div>
              </div>
            </section>
            
            {/* PRAWA KOLUMNA - Wydarzenia i Zadania */}
            <div className="lg:col-span-1 space-y-6">
              
              {allDayEvents.length > 0 && (
                <section className="bg-card border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                    <Calendar className="text-blue-500 w-5 h-5" /> Wydarzenia
                  </h3>
                  <div className="space-y-3">
                    {allDayEvents.map((item) => (
                      <PlanItem
                        key={item.id}
                        item={item}
                        onMarkAsDone={handleMarkAsDone}
                        onRemoveFromSchedule={handleRemoveFromSchedule}
                        onDeleteEvent={deleteEvent}
                      />
                    ))}
                  </div>
                </section>
              )}

              <section className="bg-card border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm">
                <h2 className="text-lg font-bold text-text mb-1 flex items-center gap-2">
                  <ListTodo className="text-green-500 w-5 h-5" /> Zadania na dziś
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-wider text-textMuted mb-5 flex items-center gap-1">
                  <GripVertical className="w-3 h-3" /> Przeciągnij na plan
                </p>
                
                {tasksLoading ? (
                  <div className="flex justify-center py-4"><LoadingState /></div>
                ) : (
                  <div className="space-y-3">
                    {activeTasks.map(task => (
                      <DraggableTask key={task.id} task={task} onTasksChange={fetchTasks}/>
                    ))}
                    {activeTasks.length === 0 && (
                      <p className="text-sm font-medium text-textMuted text-center py-4 bg-surface rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        Wszystko zrobione!
                      </p>
                    )}
                  </div>
                )}
              </section>
            </div>

          </div>
        </div>

        <DragOverlay 
          style={{ touchAction: 'none' }}
          dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: { active: { opacity: '0.5' } },
            }),
          }}
        >
          {draggedTask ? <StaticTaskItem task={draggedTask} /> : null}
        </DragOverlay>
      </DndContext>
    </Layout>
    </>
  );
}

DashboardPage.auth = true;