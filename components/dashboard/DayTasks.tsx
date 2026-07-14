import React from "react";
import NoResultsState from "../ui/NoResultsState";
import { DraggablePlanItem } from "./DraggablePlanItem";
import TaskItem from "../tasks/TaskItem"; 
import { Task } from "@/types";


interface DayTasksProps {
  loadingTasks: boolean;
  fetchingTasks: boolean;
  tasks: Task[];
  acceptTask: (id: string) => void;
  setDoneTask: (id: string) => void;
  deleteTask: (id: string) => void;
  fetchTasks: () => void; 
  editTask: (task: Task) => void;
  userId: string;
  userOptions: string[];
}

export const DayTasks = React.memo(({
  loadingTasks,
  fetchingTasks,
  tasks,
  acceptTask,
  setDoneTask,
  deleteTask,
  fetchTasks,
  editTask,
  userId,
  userOptions
}: Readonly<DayTasksProps>) => {

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
                      loading={loadingTasks}
                    />
                </div>
            </DraggablePlanItem>
          );
        })}
        {!fetchingTasks && tasks.length === 0 && <NoResultsState text="zadań" />}
      </div>
    </div>
  );
});

DayTasks.displayName = "DayTasks";