// components/dashboard/DayView.tsx

import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { Calendar, ListTodo, SaveAll, Trophy } from "lucide-react";
import {
  DndContext, useSensor, useSensors, PointerSensor, TouchSensor, DragOverlay, defaultDropAnimationSideEffects
} from "@dnd-kit/core";

import { useAuth } from "@/providers/AuthProvider";
import { useSettings } from "@/hooks/db/useSettings";
import { useTasks } from "@/hooks/db/useTasks";
import { useEvents } from "@/hooks/db/useEvents";
import { useStreaks } from "@/hooks/db/useStreaks";
import { useDaySchemas } from "@/hooks/db/useDaySchemas";
import { useDashboardDnd } from "@/hooks/useDashboardDnd";
import { usePlanByHour } from "@/hooks/usePlanByHour";
import { useDragAutoscroll } from "@/hooks/useDragAutoscroll";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { useDailyOverrides } from "@/hooks/db/useDailyOverrides";

import { DayEvents } from "./DayEvents";
import { DailyPlan } from "./DailyPlan";
import { DayTasks } from "./DayTasks";
import { DayStreaks } from "./DayStreaks";
import { DraggingTaskItem, DraggingEventItem } from "./DraggingItem";
import { AddButton, CancelButton } from "../ui/CommonButtons";
import DayHeader from "./DayHeader";
import { useWorkLogs } from "@/hooks/db/useWorkLogs";

const EventForm = dynamic(() => import("../calendar/EventForm"), { ssr: false });
const TaskForm = dynamic(() => import("../tasks/TaskForm"), { ssr: false });

interface DayViewProps {
  date: Date;
  onDateChange?: (newDate: Date) => void;
}

type DraftForm = {
  id: string;
  type: "task" | "event";
};

export default function DayView({ date, onDateChange }: Readonly<DayViewProps>) {
  const { user } = useAuth();
  const userId = user!.id;
  const { settings, loading: loadingSettings, fetching: fetchingSettings } = useSettings();
  
  const dateStr = useMemo(() => format(date, "yyyy-MM-dd"), [date]);
  const currentDayOfWeek = (date.getDay() + 6) % 7;
  const userOptions = settings?.users ?? [];
  const isToday = useMemo(() => dateStr === format(new Date(), "yyyy-MM-dd"), [dateStr]);

  const handlePrevDay = () => {
    if (onDateChange) {
      const prev = new Date(date);
      prev.setDate(prev.getDate() - 1);
      onDateChange(prev);
    }
  };

  const handleNextDay = () => {
    if (onDateChange) {
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      onDateChange(next);
    }
  };

  const [draftForms, setDraftForms] = useState<DraftForm[]>([]);
  const [draggedSchemaTitle, setDraggedSchemaTitle] = useState<string | null>(null);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);

  const { tasks, fetchTasks, setDoneTask, addTask, deleteTask, editTask, loading: loadingTasks, fetching: fetchingTasks, acceptTask } = 
    useTasks(
      dateStr, 
      dateStr,
    );
  const { events, fetchEvents, addEvent, deleteEvent, editEvent, fetching: fetchingEvents, loading: loadingEvents } = useEvents(dateStr, dateStr);
  const { streaks, getMilestoneMessage, fetching: fetchingStreaks } = useStreaks();
  const { schemas } = useDaySchemas();
  const { workLogs } = useWorkLogs(dateStr);

  const loadedDatesRef = useRef<Set<string>>(new Set());
  const [isFirstLoadForDate, setIsFirstLoadForDate] = useState(
    () => !loadedDatesRef.current.has(dateStr)
  );

  useEffect(() => {
    setIsFirstLoadForDate(!loadedDatesRef.current.has(dateStr));
  }, [dateStr]);

  useEffect(() => {
    if (!fetchingTasks && !fetchingEvents) {
      loadedDatesRef.current.add(dateStr);
      setIsFirstLoadForDate(false);
    }
  }, [fetchingTasks, fetchingEvents, dateStr]);
  
  const { overrides, hideSchema, moveSchema } = useDailyOverrides(dateStr);

  const { draggedTask, draggedEventTitle, handleDragStart, handleDragEnd } = useDashboardDnd({
    tasks, events, userId, date, editTask, editEvent
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  useDragAutoscroll(Boolean(draggedTask || draggedEventTitle || draggedSchemaTitle));

  const activeTasks = useMemo(() => tasks.filter((t) => t.status != "done"), [tasks]);
  const scheduledTasks = useMemo(() => activeTasks.filter((t) => t.scheduled_time), [activeTasks]);
  const unscheduledTasks = useMemo(() => activeTasks.filter((t) => !t.scheduled_time), [activeTasks]);

  const planByHour = usePlanByHour({
    schemas, events, workLogs, scheduledTasks, currentDayOfWeek, isToday, overrides,
  });

  const streaksWithMilestones = useMemo(() => {
    if (!streaks) return [];
    return streaks
      .map(streak => ({
        ...streak,
        milestoneMessage: getMilestoneMessage(streak.start_date)
      }))
      .filter(streak => streak.milestoneMessage !== "");
  }, [streaks, getMilestoneMessage]);

  const handleDragStartCustom = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = String(active.id);
    
    if (activeId.startsWith("plan-schema-")) {
      const schemaId = activeId.replaceAll("plan-schema-", "");
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

  const handleDragEndCustom = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedSchemaTitle(null); 

    const activeId = String(active.id);
    if (activeId.startsWith("plan-schema-")) {
       if (!over) return;
       const schemaId = activeId.replaceAll("plan-schema-", "");
       
       const timeMatch = /\d{2}:\d{2}/.exec(String(over.id));
       if (!timeMatch) return;
       
       const newTime = timeMatch[0];
       
       await moveSchema(schemaId, newTime);
    } else {
       handleDragEnd(event);
    }
  };

  // Stabilized with useCallback so DailyPlan/PlanItem (both React.memo) can
  // actually skip re-rendering — passing a fresh function reference on every
  // DayView render was silently defeating that memoization.
  const handleRemoveFromSchedule = useCallback(async (id: string, type?: string) => {
    if (type === "schema" || id.startsWith("schema-")) {
      await hideSchema(id);
      return;
    }

    const current = tasks.find((t) => String(t.id) === String(id));
    if (current) {
      await editTask({ ...current, scheduled_time: null });
    }
  }, [hideSchema, tasks, editTask]);

  const handleMarkAsDone = useCallback(async (id: string) => {
    if (id.startsWith("schema-")) {
      await hideSchema(id);
    } else {
      await setDoneTask(id);
      fetchTasks();
    }
  }, [hideSchema, setDoneTask, fetchTasks]);

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
        <DayHeader 
          date={date} 
          dateStr={dateStr} 
          onPrev={handlePrevDay} 
          onNext={handleNextDay} 
          handleAddDraft={handleAddDraft} 
          settings={settings} 
          loadingSettings={loadingSettings || fetchingSettings}
        />
        
        {!fetchingSettings && (
        <>
          {draftForms.length > 0 && (
            <div className="mb-6 space-y-4 multi-draft-container">
              {draftForms.map((draft, idx) => (
                <div key={draft.id} className="relative w-full md:w-fit">
                  <div className="absolute -left-2 -top-2 bg-secondary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 shadow">
                    {idx + 1}
                  </div>
                  {draft.type === "event" ? (
                    <EventForm 
                      currentDate={date} 
                      selectedDate={date} 
                      addAnother={() => handleAddDraft('event')}
                      onEventsChange={() => { fetchEvents(); handleRemoveDraft(draft.id); }} 
                      addEvent={addEvent}
                      onCancel={() => handleRemoveDraft(draft.id)} 
                      loading={loadingEvents}
                      addMany
                    />
                  ) : (
                    <TaskForm 
                      selectedDate={dateStr}
                      addTask={addTask}
                      addAnother={() => handleAddDraft('task')}
                      onTasksChange={() => { fetchTasks(); handleRemoveDraft(draft.id); }} 
                      onCancel={() => handleRemoveDraft(draft.id)} 
                      loading={loadingTasks}
                      addMany
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
                  type='button'
                  className="w-full py-3 hover:bg-primary bg-secondary text-white rounded-lg font-bold text-sm shadow-md flex justify-center items-center gap-2 transition-colors"
                >
                  Dodaj wszystkie {draftForms.length}
                  <SaveAll className="w-5 h-5" />
                </button>
                
                <CancelButton
                  onClick={() => setDraftForms([])} 
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <DailyPlan
                planByHour={planByHour}
                handleMarkAsDone={handleMarkAsDone}
                handleRemoveFromSchedule={handleRemoveFromSchedule}
              />
            </div>

            <div className="lg:col-span-1 space-y-6">
              <section>
                <div className="flex flex-nowrap justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                  <h2 className="text-lg font-bold text-text flex items-center gap-2">
                    <ListTodo className="text-primary w-5 h-5" />Zadania
                  </h2>
                  {!showTaskForm && <AddButton onClick={() => setShowTaskForm(true)} />}
                </div>
                
                {showTaskForm && (
                  <div className="mb-6 animate-in fade-in slide-in-from-top-4">
                    <TaskForm 
                      selectedDate={dateStr}
                      addTask={addTask}
                      onTasksChange={() => { fetchTasks(); setShowTaskForm(false); }} 
                      onCancel={() => setShowTaskForm(false)} 
                      loading={loadingTasks}
                    />
                  </div>
                )}

                <DayTasks 
                  tasks={unscheduledTasks} 
                  acceptTask={acceptTask} 
                  setDoneTask={setDoneTask} 
                  editTask={editTask} 
                  deleteTask={deleteTask} 
                  fetchingTasks={fetchingTasks && isFirstLoadForDate}
                  loadingTasks={loadingTasks} 
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
                  {!showEventForm && <AddButton onClick={() => setShowEventForm(true)} />}
                </div>
                
                {showEventForm && (
                  <div className="mb-6 animate-in fade-in slide-in-from-top-4">
                    <EventForm 
                      currentDate={date} 
                      selectedDate={date} 
                      onEventsChange={() => { fetchEvents(); setShowEventForm(false); }} 
                      addEvent={addEvent}
                      onCancel={() => setShowEventForm(false)} 
                      loading={loadingEvents}
                    />
                  </div>
                )}

                <DayEvents 
                  events={events} 
                  loadingEvents={loadingEvents} 
                  fetchingEvents={fetchingEvents && isFirstLoadForDate}
                  onEditEvent={editEvent} 
                  onDeleteEvent={deleteEvent} 
                  onEventsChange={fetchEvents} 
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
                  <DayStreaks streaks={streaksWithMilestones} fetchingStreaks={fetchingStreaks && isFirstLoadForDate} />
                </section>
              )}
            </div>
          </div>
        </>
        )}
      </div>

      <DragOverlay style={{ touchAction: "none" }} dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.5" } } }) }}>
        {dragPreview}
      </DragOverlay>
    </DndContext>
  );
}