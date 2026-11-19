// components/dashboard/WeekOverdue.tsx
//
// Rząd „Zaległe” nad kolumnami widoku tygodnia: niewykonane zadania z terminem przed pierwszym dniem zakresu.
// Tylko źródło przeciągania – upuszczenie na kolumnę dnia ustawia nowy termin.

import React from "react";
import { Siren } from "lucide-react";
import type { Task } from "@/types/tasks";
import { weekTaskDragId, type WeekDragData } from "@/hooks/useWeekDnd";
import { DraggablePlanItem } from "./DraggablePlanItem";
import { WeekTaskItem } from "./WeekItem";

interface WeekOverdueProps {
  tasks: Task[];
  onMarkAsDone: (id: string) => void;
}

export const WeekOverdue = React.memo(({ tasks, onMarkAsDone }: Readonly<WeekOverdueProps>) => {
  if (tasks.length === 0) return null;

  return (
    <section aria-labelledby="week-overdue" className="space-y-3">
      <div className="flex flex-nowrap items-center justify-between border-b border-line pb-2">
        <h2 id="week-overdue" className="section-title flex items-center gap-2">
          <Siren aria-hidden="true" className="h-5 w-5 text-danger" />
          Zaległe
          <span className="text-sm font-semibold text-text-muted">({tasks.length})</span>
        </h2>
        <p className="hidden text-xs text-text-muted sm:block">Przeciągnij na dzień, aby zmienić termin</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {tasks.map((task) => {
          const data: WeekDragData = { kind: "task", itemId: String(task.id), day: task.due_date };
          return (
            <DraggablePlanItem key={task.id} id={weekTaskDragId(task.id)} type="task" data={data}>
              <WeekTaskItem task={task} onMarkAsDone={onMarkAsDone} showDueBadge />
            </DraggablePlanItem>
          );
        })}
      </div>
    </section>
  );
});
WeekOverdue.displayName = "WeekOverdue";
