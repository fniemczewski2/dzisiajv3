import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import { useTasks } from "../hooks/useTasks";
import { useEvents } from "../hooks/useEvents";
import { useDaySchemas } from "../hooks/useDaySchemas";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import TaskItem from "../components/tasks/TaskItem";
import TaskIcons from "../components/tasks/TaskIcons";
import { 
  ListTodo, 
  Calendar,
  X,
  Plus,
  Check,
  Dumbbell,
  ShoppingCart,
  Clapperboard,
  ScrollText
} from "lucide-react";
import { Task } from "../types";
import { dateToTimestamp, formatDate, getAppDateTime } from "../lib/dateUtils";

// --- DND IMPORTS ---
import { 
  DndContext, 
  DragEndEvent,
  DragStartEvent, 
  useDraggable, 
  useDroppable, 
  useSensor, 
  useSensors, 
  PointerSensor,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import WaterTracker from "../components/tasks/WaterTracker";
import Reminders from "../components/tasks/Reminders";
import { useSettings } from "../hooks/useSettings";
import LoadingState from "../components/LoadingState";
import DailySpendingForm from "../components/bills/DailySpendingForm";

// --- CONSTANTS ---
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 - 23:00

// --- HELPER FUNCTION FOR QUICK LINKS ---
const getQuickLink = (title: string): { path: string; icon: React.ReactNode; label: string } | null => {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('trening')) {
    return { path: '/training', icon: <Dumbbell size={14} />, label: 'Trening' };
  }
  if (lowerTitle.includes('zakupy')) {
    return { path: '/notes/shopping', icon: <ShoppingCart size={14} />, label: 'Zakupy' };
  }
  if (lowerTitle.includes('spotkanie')) {
    return { path: '/notes/reports', icon: <ScrollText size={14} />, label: 'Sprawozdania' };
  }
  if (lowerTitle.includes('film')) {
    return { path: '/notes/movies', icon: <Clapperboard size={14} />, label: 'Filmy' };
  }
  
  return null;
};

// --- VISUAL ONLY COMPONENT FOR DRAG OVERLAY ---
const StaticTaskItem = ({ task }: { task: Task }) => {
  const priorityColors = {
    1: { bg: "#fca5a5", text: "#B91C1C" },
    2: { bg: "#fde68a", text: "#A16207" },
    3: { bg: "#bfdbfe", text: "#1E40AF" },
  };
  
  const colors = priorityColors[task.priority as 1 | 2 | 3] || priorityColors[3];
  
  return (
    <div className="p-3 w-[300px] bg-white border-2 border-blue-500 shadow-2xl rounded-xl opacity-90 cursor-grabbing z-50 flex items-center gap-3">
      <div
        className="w-8 h-8 text-sm font-bold rounded-md flex items-center justify-center shadow-sm shrink-0"
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
        }}
      >
        {task.priority}
      </div>
      <div className="overflow-hidden">
        <h3 className="text-sm font-bold truncate">{task.title}</h3>
        <p className="text-[10px] text-gray-500 uppercase">{task.category}</p>
      </div>
    </div>
  );
};

// --- DRAGGABLE WRAPPER FOR SCHEDULED TASKS ---
function DraggableScheduledTask({ task, children }: { task: Task, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `scheduled-task-${task.id}`,
    data: { task, isScheduled: true }
  });

  return (
    <div 
      ref={setNodeRef} 
      {...listeners} 
      {...attributes} 
      className={`touch-none cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}
    >
      {children}
    </div>
  );
}

// --- DRAGGABLE WRAPPER FOR UNSCHEDULED TASKS ---
function DraggableTask({ task, children }: { task: Task, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { task, isScheduled: false }
  });

  return (
    <div 
      ref={setNodeRef} 
      {...listeners} 
      {...attributes} 
      className={`touch-none cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-30 grayscale' : ''}`}
    >
      {children}
    </div>
  );
}

// --- DROPPABLE SLOT WRAPPER ---
function DroppableHourSlot({ time, children }: { time: string, children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${time}`,
    data: { time }
  });

  return (
    <div 
      ref={setNodeRef} 
      className={`relative min-h-[5rem] border-b border-gray-100 last:border-0 transition-colors duration-200 
        ${isOver ? 'bg-blue-50 ring-inset ring-2 ring-blue-400' : 'hover:bg-gray-50/50'}
      `}
    >
      {/* Hour Label */}
      <div className="absolute left-0 top-3 text-xs font-semibold text-gray-400 w-12 text-center pointer-events-none select-none">
        {time}
      </div>

      {/* Content Area */}
      <div className="ml-14 pl-2 pr-2 py-2 min-h-[5rem] flex flex-col justify-center">
        <div className="relative z-10">
          {children}
        </div>
        {/* Visual hint for empty slot */}
        {React.Children.count(children) === 0 && (
          <div className={`h-10 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-300 transition-opacity ${isOver ? 'opacity-0' : 'opacity-100'}`}>
            <Plus size={14} className="mr-1"/> Upuść zadanie tutaj
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const session = useSession();
  const supabase = useSupabaseClient();
  const userEmail = session?.user?.email || process.env.NEXT_PUBLIC_USER_EMAIL;
  
  const todayDate = new Date();
  const todayString = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
  const currentDayOfWeek = todayDate.getDay();
  console.log("Dashboard rendered with date:", todayString);

  const { tasks, loading: tasksLoading, fetchTasks, setDoneTask } = useTasks("", todayString);
  const { events, deleteEvent } = useEvents(todayString, todayString); 
  const { schemas } = useDaySchemas();
  const { settings, loading: loadingSettings } = useSettings();

  // State
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // All active tasks (pending or accepted)
  const activeTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'pending' || t.status === 'accepted');
  }, [tasks]);


  // Scheduled tasks (on the day plan)
  const scheduledTasks = useMemo(() => {
    return activeTasks.filter(t => t.scheduled_time);
  }, [activeTasks]);

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

    // Add schema entries (rutyna)
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
      const d = new Date(event.start_time.replace(" ", "T"));
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:00`;

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
        const d = new Date(task.scheduled_time.replace(" ", "T"));
        const timeStr = `${String(d.getHours()).padStart(2, '0')}:00`;
        
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

  const handleDragStart = (event: DragStartEvent) => {
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
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedTask(null); 
    
    if (!over || !userEmail) return;

    const targetTime = over.data.current?.time;
    if (!targetTime) return;

    // Extract task ID from drag ID
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
        alert("Nie udało się zaplanować zadania: " + error.message);
        return;
      }

      await fetchTasks();
    } catch (err) {
      console.error("Critical error scheduling task:", err);
      alert("Nie udało się zaplanować zadania.");
    }
  };

  const handleRemoveFromSchedule = async (taskId: string) => {
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
  };

  const handleMarkAsDone = async (taskId: string) => {
    try {
      await setDoneTask(String(taskId));
      await fetchTasks();
    } catch (err) {
      console.error("Error marking task as done:", err);
    }
  };

  const handleTasksChange = async () => {
    await fetchTasks();
  };

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
        <div className="p-4 space-y-6 max-w-7xl mx-auto">

          {settings?.show_habits && <TaskIcons />}
          {settings?.show_water_tracker && <WaterTracker />}
          <DailySpendingForm/>
          {settings?.show_notifications && <Reminders onTasksChange={handleTasksChange} />}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <section className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
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
                          <div key={`${item.id}-${idx}`}>
                            {item.type === 'task' ? (
                              <DraggableScheduledTask task={item.data}>
                                <div className={`mb-2 p-3 rounded-lg border text-sm shadow-sm flex justify-between items-start group bg-white ${item.color}`}>
                                  <div className="flex-1">
                                    <p className="font-semibold">{item.title}</p>
                                    <p className="text-[10px] opacity-70 uppercase">Zadanie</p>
                                  </div>
                                  <div className="flex gap-1">
                                    
                                    <button 
                                      onClick={() => handleMarkAsDone(item.id)} 
                                      className=" p-1 hover:bg-green-100 text-green-600 rounded transition-opacity"
                                      title="Zrobione"
                                    >
                                      <Check size={14} />
                                    </button>
                                    <button 
                                      onClick={() => handleRemoveFromSchedule(item.id)} 
                                      className="p-1 hover:bg-red-100 text-red-500 rounded transition-opacity"
                                      title="Usuń z planu"
                                    >
                                      <X size={14} />
                                    </button>
                                    {(() => {
                                      const quickLink = getQuickLink(item.title);
                                      return quickLink ? (
                                        <button
                                          onClick={() => router.push(quickLink.path)}
                                          title={quickLink.label}
                                          className="p-1 text-gray-600"
                                        >
                                          {quickLink.icon}
                                        </button>
                                      ) : null;
                                    })()}
                                  </div>
                                </div>
                              </DraggableScheduledTask>
                            ) : (
                              <div className={`mb-2 p-3 rounded-lg border text-sm shadow-sm flex justify-between items-start group bg-white ${item.color}`}>
                                <div className="flex-1">
                                  <p className="font-semibold">{item.title}</p>
                                  <p className="text-[10px] opacity-70 uppercase">
                                    {item.type === 'schema' && 'Rutyna'}
                                    {item.type === 'event' && 'Wydarzenie'}
                                  </p>
                                </div>
                                <div className="flex gap-1">
                                  {(() => {
                                    const quickLink = getQuickLink(item.title);
                                    return quickLink ? (
                                      <button
                                        onClick={() => router.push(quickLink.path)}
                                        title={quickLink.label}
                                        className="p-1"
                                      >
                                        {quickLink.icon}
                                      </button>
                                    ) : null;
                                  })()}
                                  {item.type === 'event' && (
                                    <>
                                    <button 
                                      onClick={() => deleteEvent(item.id)} 
                                      className="p-1 hover:bg-red-100 text-red-500 rounded transition-opacity"
                                    >
                                      <X size={14} />
                                    </button>
                                    <button
                                          onClick={() => router.push("/calendar")}
                                          title={"Kalendarz"}
                                          className="p-1 text-gray-600"
                                        >
                                          <Calendar size={14} />
                                    </button>
                                    </>
                                  )}

                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </DroppableHourSlot>
                    );
                  })}
                </div>
              </div>
            </section>

            <div className="space-y-8">
              <section className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <ListTodo /> Zadania na dziś
                </h2>
                <p className="text-xs text-gray-500 mb-4">
                   Przeciągnij aby zaplanować
                </p>
                {tasksLoading ? (
                  <p className="text-gray-500 text-sm">Ładowanie...</p>
                ) : (
                  <div className="space-y-3">
                    {activeTasks.map(task => (
                      <DraggableTask key={task.id} task={task}>
                        <TaskItem task={task} onTasksChange={fetchTasks} onStartTimer={() => {}} />
                      </DraggableTask>
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

function StatCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2">
      <div className="flex items-center justify-center gap-2">
        <p className="text-lg font-bold">{value}</p>
        <div className="w-5 h-5 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-xs text-center text-gray-600 uppercase font-medium">{title}</p>
    </div>
  );
}