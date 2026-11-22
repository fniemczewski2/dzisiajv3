// components/dashboard/WeekDayColumn.tsx
//
// Kolumna dnia w widoku tygodnia: strefa upuszczenia (id `day-yyyy-MM-dd`), nagłówek z dniem i świętem,
// przyciski dodania zadania i wydarzenia na ten dzień, wydarzenia, zadania i podglądy zadań cyklicznych
// (tylko do odczytu, przerywana ramka jak w RecurringPreviewList).

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Calendar, ListTodo, Repeat } from "lucide-react";
import type { Task } from "@/types/tasks";
import type { Event } from "@/types/events";
import type { TaskOccurrencePreview } from "@/lib/taskOccurrences";
import { dayDropId, isMovableEvent, parseDay } from "@/lib/weekPlan";
import { seriesOccurrence } from "@/lib/eventUtils";
import { weekEventDragId, weekTaskDragId, type WeekDragData } from "@/hooks/useWeekDnd";
import { DraggablePlanItem } from "./DraggablePlanItem";
import { WeekEventItem, WeekTaskItem } from "./WeekItem";
import { AddSpecificButton } from "../ui/CommonButtons";
import { SkeletonRow } from "@/components/ui/Skeleton";

interface WeekDayColumnProps {
  day: string;
  isToday: boolean;
  holiday: string | null;
  tasks: Task[];
  events: Event[];
  previews: readonly TaskOccurrencePreview[];
  loading: boolean;
  onAdd: (type: "task" | "event", day: string) => void;
  onMarkAsDone: (id: string) => void;
}

export const WeekDayColumn = React.memo(
  ({ day, isToday, holiday, tasks, events, previews, loading, onAdd, onMarkAsDone }: Readonly<WeekDayColumnProps>) => {
    const { isOver, setNodeRef } = useDroppable({ id: dayDropId(day), data: { day } });
    const date = parseDay(day);
    const dateLabel = format(date, "d MMMM", { locale: pl });
    const headingId = `week-day-${day}`;
    const isEmpty = tasks.length === 0 && events.length === 0 && previews.length === 0;

    return (
      <section
        ref={setNodeRef}
        aria-labelledby={headingId}
        className={`card flex max-w-none min-w-0 flex-col gap-2 p-2 transition-colors duration-200 ${
          isToday ? "border-primary" : ""
        } ${isOver ? "bg-info-soft ring-2 ring-primary ring-inset" : ""}`}
      >
        <div className="flex flex-col gap-2 border-b border-line pb-2">
          <div className="min-w-0 px-1">
            <h2 id={headingId} className="text-sm font-bold first-letter:uppercase">
              {format(date, "EEEE", { locale: pl })}
              <span className="sr-only">, {dateLabel}</span>
            </h2>
            <p aria-hidden="true" className={`text-xs ${isToday ? "font-semibold text-primary" : "text-text-muted"}`}>
              {isToday ? `Dzisiaj, ${dateLabel}` : dateLabel}
            </p>
            {holiday && <p className="mt-0.5 text-xs font-medium text-warning">{holiday}</p>}
          </div>
          <div className="flex gap-1">
            <AddSpecificButton
              Icon={ListTodo}
              title={`Dodaj zadanie na ${dateLabel}`}
              label={`zadanie na ${dateLabel}`}
              action={() => onAdd("task", day)}
              small
            />
            <AddSpecificButton
              Icon={Calendar}
              title={`Dodaj wydarzenie na ${dateLabel}`}
              label={`wydarzenie na ${dateLabel}`}
              action={() => onAdd("event", day)}
              small
            />
          </div>
        </div>

        {loading ? (
          <SkeletonRow />
        ) : (
          <div className="flex flex-1 flex-col gap-2">
            {events.map((event) => {
              const occurrence = seriesOccurrence(String(event.id));
              const locked = !occurrence && !isMovableEvent(event);
              const data: WeekDragData = { kind: "event", itemId: String(event.id), day };
              return (
                <DraggablePlanItem key={event.id} id={weekEventDragId(day, event.id)} type="event" data={data}>
                  <WeekEventItem event={event} locked={locked} recurring={Boolean(occurrence)} />
                </DraggablePlanItem>
              );
            })}

            {tasks.map((task) => {
              const data: WeekDragData = { kind: "task", itemId: String(task.id), day };
              return (
                <DraggablePlanItem key={task.id} id={weekTaskDragId(task.id)} type="task" data={data}>
                  <WeekTaskItem task={task} onMarkAsDone={onMarkAsDone} />
                </DraggablePlanItem>
              );
            })}

            {previews.length > 0 && (
              <ul className="flex flex-col gap-2" aria-label="Powtórzenia zadań (podgląd)">
                {previews.map(({ key, task }) => (
                  <li
                    key={key}
                    className="flex items-start gap-2 rounded-lg border border-dashed border-line-strong p-2 text-sm text-text-secondary"
                  >
                    <Repeat aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="min-w-0 leading-tight wrap-break-word">
                      <span className="sr-only">Podgląd powtórzenia: </span>
                      {task.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {isEmpty && (
              <div
                aria-hidden="true"
                className={`flex min-h-16 flex-1 rounded-lg border-2 border-dashed border-line transition-opacity ${
                  isOver ? "opacity-0" : "opacity-100"
                }`}
              />
            )}
          </div>
        )}
      </section>
    );
  }
);
WeekDayColumn.displayName = "WeekDayColumn";
