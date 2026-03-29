// components/dashboard/DayView.tsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Calendar, ListTodo, SaveAll, Trophy, X } from "lucide-react";
import {
  DndContext, useSensor, useSensors, PointerSensor, TouchSensor, DragOverlay, defaultDropAnimationSideEffects
} from "@dnd-kit/core";

import { useAuth } from "../../providers/AuthProvider";
import { useSettings } from "../../hooks/useSettings";
import { useTasks } from "../../hooks/useTasks";
import { useEvents } from "../../hooks/useEvents";
import { useStreaks } from "../../hooks/useStreaks";
import { useDaySchemas } from "../../hooks/useDaySchemas";
import { useDashboardDnd } from "../../hooks/useDashboardDnd";
import { useDailyOverrides } from "../../hooks/useDailyOverrides";
import { getPolishHolidays } from "../../lib/holidays";
import { useToast } from "../../providers/ToastProvider";

import EventForm from "../calendar/EventForm";
import TaskForm from "../tasks/TaskForm";
import { DayEvents } from "./DayEvents";
import { DailyPlan } from "./DailyPlan";
import { DayTasks } from "./DayTasks";
import { DayStreaks } from "./DayStreaks";
import { DraggingTaskItem, DraggingEventItem } from "./DraggingItem";
import { DashboardWidgets } from "../widgets/DashboardWidgets";
import { AddButton, AddSpecificButton } from "../CommonButtons";

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

interface DayViewProps {
  date: Date;
  isMain?: boolean;
  onBack?: () => void;
}

type DraftForm = {
  id: string;
  type: "task" | "event";
};

const getHourStr = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null;
  try {
    const timePart = dateStr.replace(" ", "T").split("T")[1];
    if (timePart) {
      const hour = timePart.split(":")[0];
      if (hour && !Number.isNaN(Number(hour))) {
        return hour.padStart(2, "0");
      }
    }
  } catch {
    throw new Error(`Wystąpił błąd pobierania godziny.`);
  }
  return null;
};

export default function DayView({ date, isMain = false, onBack }: Readonly<DayViewProps>) {
  const { user } = useAuth();
  const userId = user!.id;
  const { settings } = useSettings();
  const { toast } = useToast();
  
  const dateStr = useMemo(() => format(date, "yyyy-MM-dd"), [date]);
  const currentDayOfWeek = (date.getDay() + 6) % 7;
  const userOptions = settings?.users ?? [];
  const isToday = useMemo(() => dateStr === format(new Date(), "yyyy-MM-dd"), [dateStr]);

  const [draftForms, setDraftForms] = useState<DraftForm[]>([]);
  const [draggedSchemaTitle, setDraggedSchemaTitle] = useState<string | null>(null);

  const { tasks, loading: tasksLoading, fetchTasks, setDoneTask, addTask, deleteTask, editTask, loading: loadingTasks, acceptTask } = useTasks(dateStr, dateStr);
  const { events, fetchEvents, addEvent, deleteEvent, editEvent, loading: loadingEvents } = useEvents(dateStr, dateStr);
  const { streaks, getMilestoneMessage } = useStreaks();
  const { schemas } = useDaySchemas();
  
  const { overrides, hideSchema, moveSchema } = useDailyOverrides(dateStr);

  const holiday = useMemo(() => {
    const map = getPolishHolidays(date.getFullYear());
    return map[dateStr] ?? null;
  }, [dateStr, date]);

  const { draggedTask, draggedEventTitle, handleDragStart, handleDragEnd } = useDashboardDnd({
    tasks, events, userId, date, editTask, editEvent, fetchTasks, fetchEvents,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const lastMouseY = useRef<number>(0);
  useEffect(() => {
    if (!draggedTask && !draggedEventTitle && !draggedSchemaTitle) return;
    let animationFrameId: number;
    const scrollSpeed = 10;
    const edgeThreshold = 100;

    const autoScroll = () => {
      const y = lastMouseY.current;
      const h = window.innerHeight;
      if (y > h - edgeThreshold) window.scrollBy(0, scrollSpeed);
      else if (y < edgeThreshold) window.scrollBy(0, -scrollSpeed);
      animationFrameId = requestAnimationFrame(autoScroll);
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (e instanceof MouseEvent) lastMouseY.current = e.clientY;
      else if (e.touches.length > 0) lastMouseY.current = e.touches[0].clientY;
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("touchmove", handleMove);
    animationFrameId = requestAnimationFrame(autoScroll);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("touchmove", handleMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [draggedTask, draggedEventTitle, draggedSchemaTitle]);

  const activeTasks = useMemo(() => tasks.filter((t) => t.status === "pending" || t.status === "accepted"), [tasks]);
  const scheduledTasks = useMemo(() => activeTasks.filter((t) => t.scheduled_time), [activeTasks]);
  const unscheduledTasks = useMemo(() => activeTasks.filter((t) => !t.scheduled_time), [activeTasks]);

  const planByHour = useMemo(() => {
    const map: Record<string, any[]> = {};
    HOURS.forEach((h) => { map[`${String(h).padStart(2, "0")}:00`] = []; });
    
    const todaySchema = schemas.find((s) => s.days?.includes(currentDayOfWeek));
    if (todaySchema?.entries) {
      todaySchema.entries.forEach((entry, idx) => {
        const schemaId = `schema-${idx}`;
        const override = overrides.find(o => o.schema_id === schemaId);
        
        if (override?.new_time === null) return;

        const rawTime = override?.new_time || entry.time;
        const timeMatch = rawTime.match(/\d{2}:\d{2}/);
        const timeToUse = timeMatch ? timeMatch[0] : rawTime;
        
        const h = timeToUse.split(":")[0].padStart(2, "0");
        const key = `${h}:00`;
        
        if (map[key]) {
          map[key].push({ 
            id: schemaId, 
            title: entry.label, 
            type: "schema", 
            color: "bg-surface border border-dashed border-gray-200 dark:border-gray-700 text-textSecondary" 
          });
        }
      });
    }

    events.forEach((event) => {
      const h = getHourStr(event.start_time);
      if (h) {
        const key = `${h}:00`;
        if (map[key]) {
          map[key].push({ id: event.id, title: event.title, type: "event", color: "card shadow-sm text-text border-l-4 border-l-primary", data: event });
        }
      }
    });

    scheduledTasks.forEach((task) => {
      const h = getHourStr(task.scheduled_time);
      if (h) {
        const key = `${h}:00`;
        if (map[key]) {
          map[key].push({ id: String(task.id), title: task.title, type: "task", color: "card shadow-sm text-text", data: task });
        }
      }
    });

    if (isToday) {
      const currentHour = new Date().getHours();
      const filteredMap: Record<string, any[]> = {};
      
      Object.keys(map).forEach((timeKey) => {
        const hourNum = Number.parseInt(timeKey.split(":")[0], 10);
        
        if (hourNum < currentHour) {
          const shouldKeepPastHour = map[timeKey].some(item => {
            if (item.type === "task" || item.type === "schema") return true; 
            
            if (item.type === "event" && item.data?.end_time) {
              const endH = getHourStr(item.data.end_time);
              if (endH !== null) {
                return Number.parseInt(endH, 10) >= currentHour; 
              }
            }
            return false; 
          });

          if (shouldKeepPastHour) {
            filteredMap[timeKey] = map[timeKey];
          }
        } else {
          filteredMap[timeKey] = map[timeKey];
        }
      });
      return filteredMap;
    }

    return map;
  }, [schemas, events, scheduledTasks, currentDayOfWeek, isToday, overrides]);

  const streaksWithMilestones = useMemo(() => {
    if (!streaks) return [];
    return streaks
      .map(streak => ({
        ...streak,
        milestoneMessage: getMilestoneMessage(streak.start_date)
      }))
      .filter(streak => streak.milestoneMessage !== "");
  }, [streaks, getMilestoneMessage]);

  const handleDragStartCustom = (event: any) => {
    const { active } = event;
    const activeId = String(active.id);
    
    if (activeId.startsWith("plan-schema-")) {
      const schemaId = activeId.replace("plan-schema-", "");
      let title = "Rutyna";
      for (const hour of Object.keys(planByHour)) {
         const found = planByHour[hour].find(i => i.id === schemaId);
         if (found) { title = found.title; break; }
      }
      setDraggedSchemaTitle(title);
    } else {
      handleDragStart(event);
    }
  };

  const handleDragEndCustom = async (event: any) => {
    const { active, over } = event;
    setDraggedSchemaTitle(null); 

    const activeId = String(active.id);
    if (activeId.startsWith("plan-schema-")) {
       if (!over) return;
       const schemaId = activeId.replace("plan-schema-", "");
       
       const timeMatch = /\d{2}:\d{2}/.exec(String(over.id));
       if (!timeMatch) return;
       
       const newTime = timeMatch[0];
       
       await moveSchema(schemaId, newTime);
       toast.success(`Rutyna przeniesiona na godzinę ${newTime}.`);
    } else {
       handleDragEnd(event);
    }
  };

  const handleRemoveFromSchedule = async (id: string, type?: string) => {
    if (type === "schema" || id.startsWith("schema-")) {
      await hideSchema(id);
      toast.success("Rutyna ukryta z dzisiejszego planu.");
      return;
    }

    const current = tasks.find((t) => String(t.id) === String(id));
    if (current) {
      await editTask({ ...current, scheduled_time: null });
    }
  };

  const handleAddDraft = (type: "task" | "event") => {
    setDraftForms((prev) => [...prev, { id: crypto.randomUUID(), type }]);
  };

  const handleRemoveDraft = (id: string) => {
    setDraftForms((prev) => prev.filter((f) => f.id !== id));
  };

  const dragPreview = (() => {
    if (draggedTask) {
      return <DraggingTaskItem title={draggedTask.title} />;
    }
    
    if (draggedEventTitle) {
      return <DraggingEventItem title={draggedEventTitle} />;
    }
    
    if (draggedSchemaTitle) {
      return <DraggingTaskItem title={draggedSchemaTitle} />;
    }
    
    return null;
  })();

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStartCustom} onDragEnd={handleDragEndCustom}>
      <div className="space-y-4 sm:space-y-6 mx-auto w-full">
        
        <div className="flex items-center justify-between relative">
          {onBack && (
            <button onClick={onBack} className="w-10 h-10 bg-surface hover:bg-surfaceHover border border-gray-200 dark:border-gray-700 flex items-center justify-center text-textSecondary hover:text-text rounded-lg transition-colors shrink-0">
              <Calendar className="w-5 h-5" />
            </button>
          )}

          <div className="flex flex-col items-center flex-1">
            <h3 className="font-bold text-base sm:text-2xl text-text text-center flex items-center justify-center">
              {format(date, "d MMMM yyyy", { locale: pl })}
            </h3>
            {holiday && <span className="text-red-600 dark:text-red-400 text-xs font-medium uppercase tracking-wider mt-1">{holiday}</span>}
          </div>
          <div className="flex min-w-[140px] items-center gap-2">
            <AddSpecificButton Icon={ListTodo} title={"Dodaj zadanie"} label={"zadanie"} action={() => handleAddDraft('task')}/>
            <AddSpecificButton Icon={Calendar} title={"Dodaj wydarzenie"} label={"wydarzenie"} action={() => handleAddDraft('event')}/>
          </div>
        </div>

        <DashboardWidgets settings={settings}/>
        
        {draftForms.length > 0 && (
          <div className="mb-6 space-y-4 multi-draft-container [&_.dzisiaj-save-btn]:!hidden">
            {draftForms.map((draft, idx) => (
              <div key={draft.id} className="relative w-full md:w-fit">
                <div className="absolute -left-2 -top-2 bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 shadow">
                  {idx + 1}
                </div>
                {draft.type === "event" ? (
                  <EventForm 
                    currentDate={date} 
                    selectedDate={date} 
                    onEventsChange={() => { fetchEvents(); handleRemoveDraft(draft.id); }} 
                    addEvent={addEvent}
                    onCancel={() => handleRemoveDraft(draft.id)} 
                    loading={loadingEvents}
                  />
                ) : (
                  <TaskForm 
                    selectedDate={dateStr}
                    addTask={addTask}
                    onTasksChange={() => { fetchTasks(); handleRemoveDraft(draft.id); }} 
                    onCancel={() => handleRemoveDraft(draft.id)} 
                    loading={loadingTasks}
                  />
                )}
              </div>
            ))}
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <button 
                onClick={() => {
                  const forms = document.querySelectorAll('.multi-draft-container form');
                  forms.forEach(form => {
                    const f = form as HTMLFormElement;
                    if (typeof f.requestSubmit === 'function') {
                      f.requestSubmit();
                    } else {
                      f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                    }
                  });
                }}
                className="w-full py-3 bg-primary hover:bg-secondary text-white rounded-lg font-bold text-sm shadow-md flex justify-center items-center gap-2 transition-colors"
              >
                ZAPISZ WSZYSTKIE {draftForms.length}
                <SaveAll className="w-5 h-5" />
              </button>
              
              <button 
                onClick={() => setDraftForms([])} 
                className="flex justify-center items-center gap-2 w-full sm:w-1/3 py-3 bg-surface hover:bg-surfaceHover text-textSecondary rounded-lg border border-gray-200 dark:border-gray-800 text-sm font-bold uppercase tracking-wider transition-colors"
              >
                Zamknij
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DailyPlan
              planByHour={planByHour} 
              handleMarkAsDone={async (id) => {
                if (id.startsWith("schema-")) {
                  await hideSchema(id);
                  toast.success("Rutyna zaliczona na dzisiaj!");
                } else {
                  setDoneTask(id);
                }
              }} 
              handleDeleteTask={async (id) => deleteTask(id)}
              handleRemoveFromSchedule={handleRemoveFromSchedule} 
              handleDeleteEvent={deleteEvent}
            />
          </div>

          <div className="lg:col-span-1 space-y-6">
            <section>
              <div className="flex flex-nowrap justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                <h2 className="text-lg font-bold text-text flex items-center gap-2">
                  <ListTodo className="text-primary w-5 h-5" />Zadania
                </h2>
                <AddButton onClick={() => handleAddDraft('task')} small />
              </div>
              <DayTasks 
                tasks={unscheduledTasks} 
                acceptTask={acceptTask} 
                setDoneTask={setDoneTask} 
                editTask={editTask} 
                deleteTask={deleteTask} 
                tasksLoading={tasksLoading} 
                fetchTasks={fetchTasks}
                userId={userId}
                userOptions={userOptions} 
              />
            </section>

            <section>
              <div className="flex flex-nowrap justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                <h2 className="text-lg font-bold text-text flex items-center gap-2">
                  <Calendar className="text-primary w-5 h-5" /> Wydarzenia
                </h2>
                <AddButton onClick={() => handleAddDraft('event')} small />
              </div>
              <DayEvents 
                events={events} 
                loading={tasksLoading} 
                onEditEvent={editEvent} 
                onDeleteEvent={deleteEvent} 
                onEventsChange={fetchEvents} 
                userId={userId}
                userOptions={userOptions} 
              />
            </section>
            
            {streaksWithMilestones.length > 0 && (
              <section>
                <div className="flex flex-nowrap justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                  <h2 className="text-lg font-bold text-text flex items-center gap-2">
                    <Trophy className="text-primary w-5 h-5" /> Postępy
                  </h2>
                </div>
                <DayStreaks streaks={streaksWithMilestones} />
              </section>
            )}
          </div>
        </div>
      </div>

      <DragOverlay style={{ touchAction: "none" }} dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.5" } } }) }}>
        {dragPreview}
      </DragOverlay>
    </DndContext>
  );
}