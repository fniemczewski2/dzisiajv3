// components/dashboard/DayTasks.tsx
import React, { useEffect } from "react";
import LoadingState from "../LoadingState";
import NoResultsState from "../NoResultsState";
import { DraggablePlanItem } from "./DraggablePlanItem";
import TaskItem from "../tasks/TaskItem"; 
import { Task } from "../../types";
import { useToast } from "../../providers/ToastProvider";

interface DayTasksProps {
  tasksLoading: boolean;
  tasks: Task[];
  acceptTask: (id: string) => void;
  setDoneTask: (id: string) => void;
  deleteTask: (id: string) => void;
  removeFromSchedule: (id: string) => void;
  fetchTasks: () => void; 
  editTask: (task: any) => void;
}

export const DayTasks = React.memo(({
  tasksLoading,
  tasks,
  acceptTask,
  setDoneTask,
  deleteTask,
  removeFromSchedule,
  fetchTasks,
  editTask
}: DayTasksProps) => {

  const { toast } = useToast();

  // ZMIANA: Obsługa toast.loading w tle
  useEffect(() => {
    let toastId: string | undefined;
    
    if (tasksLoading && toast.loading) {
      toastId = toast.loading("ładowanie...");
    }

    return () => {
      // Czyszczenie (zamykanie) toasta, gdy ładowanie dobiegnie końca
      if (toastId && toast.dismiss) {
        toast.dismiss(toastId);
      }
    };
  }, [tasksLoading, toast]);

  return (
    <div className="mb-6">
      {tasksLoading ? (
        <div className="flex justify-center py-4"><LoadingState /></div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            return (
              <DraggablePlanItem key={`task-${task.id}`} id={`task-${task.id}`} type="task">
                 <div className="w-full list-none">
                      <TaskItem
                        task={task}
                        acceptTask={acceptTask}
                        setDoneTask={setDoneTask}
                        editTask={editTask}
                        deleteTask={deleteTask}
                        onTasksChange={fetchTasks}
                      />
                    </div>
              </DraggablePlanItem>
            );
          })}
          {tasks.length === 0 && <NoResultsState text="zadań" />}
        </div>
      )}
    </div>
  );
});

DayTasks.displayName = "DayTasks";