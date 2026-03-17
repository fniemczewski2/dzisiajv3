import React from "react";
import { ListTodo, GripVertical } from "lucide-react";
import LoadingState from "../LoadingState";
import NoResultsState from "../NoResultsState";
import { DraggablePlanItem } from "./DraggablePlanItem";
import { PlanItem } from "./PlanItem";
import { AddButton } from "../CommonButtons";
import { useRouter } from "next/router";

interface UnscheduledTasksProps {
  tasksLoading: boolean;
  activeTasks: any[];
  handleMarkAsDone: (id: string) => void;
  handleDeleteTask: (id: string) => void;
  handleRemoveFromSchedule: (id: string) => void;
  handleDeleteEvent: (id: string) => void;
}

export const UnscheduledTasks = React.memo(({
  tasksLoading,
  activeTasks,
  handleMarkAsDone,
  handleRemoveFromSchedule,
}: UnscheduledTasksProps) => {
  const router = useRouter();

  return (
    <section className="card rounded-xl p-5 sm:p-6 shadow-sm">
      <div className="flex flex-nowrap justify-between">
        <h2 className="text-lg font-bold text-text mb-1 flex items-center gap-2">
          <ListTodo className="text-green-500 w-5 h-5" /> Zadania
        </h2>
        <AddButton onClick={() => router.push("/tasks?action=add")} type="button" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-textMuted mb-5 flex items-center gap-1">
        <GripVertical className="w-3 h-3" /> Przeciągnij na plan
      </p>

      {tasksLoading ? (
        <div className="flex justify-center py-4"><LoadingState /></div>
      ) : (
        <div className="space-y-3">
          {activeTasks.map((task) => {
            const planItemData = {
              id: String(task.id),
              title: task.title,
              type: "task" as const,
              data: task,
            };
            return (
              <DraggablePlanItem key={`task-${task.id}`} id={`task-${task.id}`} type="task">
                <PlanItem
                  item={planItemData}
                  onMarkAsDoneTask={handleMarkAsDone}
                  onRemoveFromSchedule={handleRemoveFromSchedule}
                />
              </DraggablePlanItem>
            );
          })}
          {activeTasks.length === 0 && <NoResultsState text="zadań" />}
        </div>
      )}
    </section>
  );
});
UnscheduledTasks.displayName = "UnscheduledTasks";