import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import { useTasks } from "../hooks/useTasks";
import { useEvents } from "../hooks/useEvents";
import { useDaySchemas } from "../hooks/useDaySchemas";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import TaskItem from "../components/tasks/TaskItem";
import TaskIcons from "../components/tasks/TaskIcons";
import { ListTodo, Calendar } from "lucide-react";
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
import Reminders from "../components/tasks/Reminders";
import { useSettings } from "../hooks/useSettings";
import LoadingState from "../components/LoadingState";
import DailySpendingForm from "../components/bills/DailySpendingForm";

// Import separated components
import { StaticTaskItem } from "../components/dashboard/StaticTaskItem";
import DraggableTask from "../components/eisenhower/DraggableTask";
import { DroppableHourSlot } from "../components/dashboard/DroppableHourSlot";
import { PlanItem } from "../components/dashboard/PlanItem";

// --- CONSTANTS ---
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 - 23:00

export default function DashboardPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const session = useSession();
  const supabase = useSupabaseClient();
  const userEmail = session?.user?.email || process.env.NEXT_PUBLIC_USER_EMAIL;
  
  const todayDate = new Date();
  const todayString = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
  const currentDayOfWeek = todayDate.getDay();

  const { tasks, loading: tasksLoading, fetchTasks, setDoneTask } = useTasks("", todayString);
  const { events, deleteEvent } = useEvents(todayString, todayString); 
  const { schemas } = useDaySchemas();
  const { settings, loading: loadingSettings } = useSettings();

  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  // Configure sensors with long press for touch and immediate for mouse
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Long press - 250ms
        tolerance: 5, // Allow 5px movement during press
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
    const edgeThreshold = 100; // pixels from edge to start scrolling

    const autoScroll = () => {
      const mouseY = (window as any).lastMouseY || 0;
      const windowHeight = window.innerHeight;
      
      // Scroll down when near bottom
      if (mouseY > windowHeight - edgeThreshold) {
        window.scrollBy(0, scrollSpeed);
      }
      // Scroll up when near top
      else if (mouseY < edgeThreshold) {
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

  // Memoized active tasks
  const activeTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'pending' || t.status === 'accepted');
  }, [tasks]);

  // Memoized scheduled tasks
  const scheduledTasks = useMemo(() => {
    return activeTasks.filter(t => t.scheduled_time);
  }, [activeTasks]);

  // Memoized plan by hour
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

    // Add schema entries
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
            color: 'bg-gray-100 text-gray-600 border-gray-200'
          });
        }
      });
    }

    // Add events
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
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          data: event
        });
      }
    });

    // Add scheduled tasks
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
            color: 'bg-green-100 text-green-800 border-green-200',
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
    
    if (!over || !userEmail) return;

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
  }, [userEmail, tasks, todayDate, supabase, fetchTasks]);

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
    <Layout>
      <SEO title="Panel - Dzisiaj v3" description="Twój osobisty pulpit nawigacyjny" />
      
      <DndContext 
        id="dashboard-dnd"
        sensors={sensors} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-2 sm:space-y-6 max-w-7xl mx-auto">

          {settings?.show_habits && <TaskIcons />}
          {settings?.show_water_tracker && <WaterTracker />}
          <DailySpendingForm/>
          {settings?.show_notifications && <Reminders onTasksChange={fetchTasks} />}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <section className="lg:col-span-2">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Calendar className="text-gray-700" /> Twój Plan Dnia
              </h2>
              
              <div className="relative">
                <div className="absolute left-[1.65rem] top-4 bottom-4 w-0.5 bg-gray-100 z-0"></div>
                <div className="space-y-0 relative z-10">
                  {HOURS.map((h) => {
                    const timeKey = `${String(h).padStart(2, '0')}:00`;
                    const items = planByHour[timeKey] || [];

                    return (
                      <DroppableHourSlot key={timeKey} time={timeKey}>
                        {items.map((item, idx) => (
                          <PlanItem
                            key={`${item.id}-${idx}`}
                            item={item}
                            router={router}
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

            <div className="space-y-8">
              <section >
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <ListTodo /> Zadania na dziś
                </h2>
                <p className="text-xs text-gray-500 mb-4">
                  Przytrzymaj i przeciągnij aby zaplanować
                </p>
                {tasksLoading ? (
                  <p className="text-gray-500 text-sm">Ładowanie...</p>
                ) : (
                  <div className="space-y-3" style={{ overflowAnchor: 'none' }}>
                    {activeTasks.map(task => (
                      <DraggableTask key={task.id} task={task}/>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: { active: { opacity: '0.5' } },
          }),
        }}>
          {draggedTask ? <StaticTaskItem task={draggedTask} /> : null}
        </DragOverlay>
      </DndContext>
    </Layout>
  );
}

DashboardPage.auth = true;