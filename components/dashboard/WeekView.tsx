// components/dashboard/WeekView.tsx
//
// Widok tygodnia na ekranie głównym (ustawienie dashboard_layout = "week"): wczoraj, dzień widoku i 5 kolejnych
// dni. Zadania i wydarzenia przenoszone między dniami przeciąganiem (useWeekDnd), rząd „Zaległe” nad dniami,
// podglądy zadań cyklicznych tylko do odczytu. Rutyny, czas pracy, pociągi i briefing – tylko w widoku dnia.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { DndContext, DragOverlay, defaultDropAnimationSideEffects } from "@dnd-kit/core";

import { useSettings } from "@/hooks/db/useSettings";
import { useTasks } from "@/hooks/db/useTasks";
import { useEvents } from "@/hooks/db/useEvents";
import { useRecurringTaskPreviews } from "@/hooks/db/useRecurringTaskPreviews";
import { useNow } from "@/hooks/useNow";
import { usePlanSensors } from "@/hooks/useDashboardDnd";
import { useWeekDnd } from "@/hooks/useWeekDnd";
import { useDragAutoscroll } from "@/hooks/useDragAutoscroll";
import { getPolishHolidays } from "@/lib/holidays";
import { groupPreviewsByDate } from "@/lib/taskOccurrences";
import { groupEventsByDay, parseDay, splitWeekTasks, weekDays, weekRangeLabel } from "@/lib/weekPlan";

import DayHeader from "./DayHeader";
import QuickNotes from "./QuickNotes";
import { WeekDayColumn } from "./WeekDayColumn";
import { WeekOverdue } from "./WeekOverdue";
import { DraggingEventItem, DraggingTaskItem } from "./DraggingItem";

const EventForm = dynamic(() => import("../calendar/EventForm"), { ssr: false });
const TaskForm = dynamic(() => import("../tasks/TaskForm"), { ssr: false });

interface WeekViewProps {
  date: Date;
  onDateChange?: (newDate: Date) => void;
}

type OpenForm = { type: "task" | "event"; day: string };

const NO_PREVIEWS: never[] = [];

export default function WeekView({ date, onDateChange }: Readonly<WeekViewProps>) {
  const { settings, loading: loadingSettings, fetching: fetchingSettings } = useSettings();
  const now = useNow();
  const today = format(now, "yyyy-MM-dd");

  const dateStr = useMemo(() => format(date, "yyyy-MM-dd"), [date]);
  const days = useMemo(() => weekDays(date), [date]);
  const from = days[0];
  const to = days.at(-1) ?? from;

  const shiftDate = (delta: number) => {
    if (!onDateChange) return;
    const next = new Date(date);
    next.setDate(next.getDate() + delta);
    onDateChange(next);
  };

  // Jedno zapytanie od początku do końca zakresu: zaległe i dni tygodnia dzielą stan optymistyczny,
  // więc przeniesienie zadania z „Zaległych” na dzień nie wymaga odświeżania drugiej listy.
  const {
    tasks,
    fetchTasks,
    setDoneTask,
    addTask,
    editTask,
    loading: loadingTasks,
    fetching: fetchingTasks,
  } = useTasks(undefined, to);
  const {
    events,
    fetchEvents,
    addEvent,
    editEvent,
    loading: loadingEvents,
    fetching: fetchingEvents,
    moveOccurrence,
    resetOccurrence,
    overrideFor,
  } = useEvents(from, to);
  const previews = useRecurringTaskPreviews(from, to, tasks);

  // Szkielety tylko przy pierwszym wczytaniu zakresu (jak w DayView); zbiór aktualizowany w trakcie renderu.
  const [loadedRanges, setLoadedRanges] = useState<ReadonlySet<string>>(() => new Set());
  if (!fetchingTasks && !fetchingEvents && !loadedRanges.has(from)) {
    setLoadedRanges((prev) => new Set(prev).add(from));
  }
  const isFirstLoad = !loadedRanges.has(from);

  const { overdue, byDay: tasksByDay } = useMemo(() => splitWeekTasks(tasks, days, today), [tasks, days, today]);
  const eventsByDay = useMemo(() => groupEventsByDay(events, days), [events, days]);
  const previewsByDay = useMemo(() => groupPreviewsByDate(previews), [previews]);
  const holidays = useMemo(() => {
    const years = new Set(days.map((d) => Number(d.slice(0, 4))));
    return Object.assign({}, ...[...years].map((y) => getPolishHolidays(y))) as Record<string, string>;
  }, [days]);

  const { dragged, handleDragStart, handleDragEnd, handleDragCancel } = useWeekDnd({
    tasks,
    events,
    editTask,
    editEvent,
    moveOccurrence,
    resetOccurrence,
    overrideFor,
  });
  const sensors = usePlanSensors();
  useDragAutoscroll(Boolean(dragged));

  const [openForm, setOpenForm] = useState<OpenForm | null>(null);
  const formDate = useMemo(() => (openForm ? parseDay(openForm.day) : null), [openForm]);
  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (openForm) formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [openForm]);

  const handleAdd = useCallback((type: "task" | "event", day: string) => setOpenForm({ type, day }), []);
  const closeForm = useCallback(() => setOpenForm(null), []);

  const handleMarkAsDone = useCallback(
    (id: string) => {
      void setDoneTask(id).then(() => fetchTasks());
    },
    [setDoneTask, fetchTasks]
  );

  const dragPreview = (() => {
    if (!dragged) return null;
    return dragged.kind === "task" ? (
      <DraggingTaskItem title={dragged.title} />
    ) : (
      <DraggingEventItem title={dragged.title} />
    );
  })();

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={(event) => void handleDragEnd(event)}
      onDragCancel={handleDragCancel}
    >
      <div className="mx-auto w-full space-y-4 sm:space-y-6">
        <DayHeader
          date={date}
          dateStr={dateStr}
          onPrev={() => shiftDate(-1)}
          onNext={() => shiftDate(1)}
          handleAddDraft={(type) => handleAdd(type, dateStr)}
          settings={settings}
          loadingSettings={loadingSettings || fetchingSettings}
          rangeLabel={weekRangeLabel(days)}
        />

        {!fetchingSettings && (
          <>
            <QuickNotes
              date={date}
              dateStr={dateStr}
              addTask={addTask}
              addEvent={addEvent}
              onTaskCreated={() => void fetchTasks()}
              onEventCreated={() => void fetchEvents()}
              loadingEvents={loadingEvents}
            />

            {openForm && (
              <div ref={formRef} className="w-full animate-in scroll-mt-4 fade-in slide-in-from-top-4 md:w-fit">
                {openForm.type === "task" ? (
                  <TaskForm
                    key={`task-${openForm.day}`}
                    selectedDate={openForm.day}
                    addTask={addTask}
                    onTasksChange={() => {
                      void fetchTasks();
                      closeForm();
                    }}
                    onCancel={closeForm}
                    loading={loadingTasks}
                  />
                ) : (
                  <EventForm
                    key={`event-${openForm.day}`}
                    currentDate={formDate}
                    selectedDate={formDate}
                    addEvent={addEvent}
                    onEventsChange={() => {
                      void fetchEvents();
                      closeForm();
                    }}
                    onCancel={closeForm}
                    loading={loadingEvents}
                  />
                )}
              </div>
            )}

            <WeekOverdue tasks={overdue} onMarkAsDone={handleMarkAsDone} />

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-7">
              {days.map((day) => (
                <WeekDayColumn
                  key={day}
                  day={day}
                  isToday={day === today}
                  holiday={holidays[day] ?? null}
                  tasks={tasksByDay[day]}
                  events={eventsByDay[day]}
                  previews={previewsByDay.get(day) ?? NO_PREVIEWS}
                  loading={isFirstLoad && (fetchingTasks || fetchingEvents)}
                  onAdd={handleAdd}
                  onMarkAsDone={handleMarkAsDone}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <DragOverlay
        style={{ touchAction: "none" }}
        dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.5" } } }) }}
      >
        {dragPreview}
      </DragOverlay>
    </DndContext>
  );
}
