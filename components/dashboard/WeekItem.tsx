// components/dashboard/WeekItem.tsx
//
// Zwarte karty widoku tygodnia (wąska kolumna dnia): zadanie z priorytetem, godziną, kategorią i przyciskiem
// „Zrobione”; wydarzenie z godzinami i znacznikiem serii. Wygląd jak PlanItem (planu dnia).

import React from "react";
import { Calendar, Repeat } from "lucide-react";
import { getPriorityColors } from "@/config/priority";
import { formatTime } from "@/lib/dateUtils";
import type { Task } from "@/types/tasks";
import type { Event } from "@/types/events";
import TimeContextBadge from "../tasks/TimeContextBadge";
import { ConfirmButton } from "../ui/CommonButtons";

const CARD = "flex items-start gap-2 rounded-lg border border-line bg-surface p-2 text-text";
const TITLE = "line-clamp-3 text-sm leading-tight font-bold wrap-break-word";

interface WeekTaskItemProps {
  task: Task;
  onMarkAsDone?: (id: string) => void;
  /** Etykieta terminu (rząd „Zaległe”). */
  showDueBadge?: boolean;
}

export const WeekTaskItem = React.memo(({ task, onMarkAsDone, showDueBadge }: Readonly<WeekTaskItemProps>) => {
  const isDone = task.status === "done";
  return (
    <div className={`${CARD} ${isDone ? "opacity-60" : ""}`}>
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
        style={getPriorityColors(Number(task.priority ?? 3))}
      >
        {task.priority}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`${TITLE} ${isDone ? "text-text-muted line-through" : ""}`}>{task.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
          {task.scheduled_time && <span>{formatTime(task.scheduled_time)}</span>}
          {task.category && <span className="font-semibold">{task.category}</span>}
          {showDueBadge && <TimeContextBadge dueDate={task.due_date} small />}
        </p>
      </div>
      {!isDone && onMarkAsDone && (
        <div className="shrink-0" onPointerDown={(e) => e.stopPropagation()}>
          <ConfirmButton onClick={() => onMarkAsDone(String(task.id))} label={`Zrobione: ${task.title}`} small />
        </div>
      )}
    </div>
  );
});
WeekTaskItem.displayName = "WeekTaskItem";

const eventTimes = (event: Event): string => {
  const sameDay = event.start_time.slice(0, 10) === event.end_time.slice(0, 10);
  return sameDay
    ? `${formatTime(event.start_time)}–${formatTime(event.end_time)}`
    : `${formatTime(event.start_time, true)} – ${formatTime(event.end_time, true)}`;
};

interface WeekEventItemProps {
  event: Event;
  /** Urodziny lub imieniny z kontaktu – bez przenoszenia w widoku tygodnia. */
  locked: boolean;
  /** Wystąpienie serii – przeniesienie dotyczy tylko tego jednego terminu. */
  recurring?: boolean;
}

export const WeekEventItem = React.memo(({ event, locked, recurring = false }: Readonly<WeekEventItemProps>) => (
  <div className={CARD}>
    <Calendar aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
    <div className="min-w-0 flex-1">
      <p className={TITLE}>{event.title}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
        <span>{eventTimes(event)}</span>
        {(locked || recurring) && (
          <span
            className="inline-flex items-center gap-1"
            title={
              locked
                ? "Urodziny lub imieniny – zmienisz je w kontakcie"
                : "Wydarzenie cykliczne – przeniesienie dotyczy tylko tego terminu"
            }
          >
            <Repeat aria-hidden="true" className="h-3 w-3" />
            <span className="sr-only">{locked ? "Z kontaktu" : "Wydarzenie cykliczne"}</span>
          </span>
        )}
      </p>
    </div>
  </div>
));
WeekEventItem.displayName = "WeekEventItem";
