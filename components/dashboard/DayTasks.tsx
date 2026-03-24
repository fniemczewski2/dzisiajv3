import React, { useEffect } from "react";
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
  fetchTasks: () => void; 
  editTask: (task: any) => void;
  userId: string;
  userOptions: string[];
}

export const DayTasks = React.memo(({
  tasksLoading,
  tasks,
  acceptTask,
  setDoneTask,
  deleteTask,
  fetchTasks,
  editTask,
  userId,
  userOptions
}: DayTasksProps) => {
  const { toast } = useToast();

  useEffect(() => {
    let toastId: string | undefined;
    if (tasksLoading && toast.loading) toastId = toast.loading("Ładowanie zadań...");
    return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [tasksLoading, toast]);

  return (
    <div className="mb-6">
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
                      userId={userId}
                      userOptions={userOptions}
                    />
                  </div>
            </DraggablePlanItem>
          );
        })}
        {!tasksLoading && tasks.length === 0 && <NoResultsState text="zadań" />}
      </div>
    </div>
  );
});

DayTasks.displayName = "DayTasks";