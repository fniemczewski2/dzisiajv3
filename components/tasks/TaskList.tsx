import React, { useState } from "react";
import TaskItem from "./TaskItem";
import TaskTimer from "./TaskTimer";
import { Task } from "../../types";
import NoResultsState from "../NoResultsState";

interface Props {
  tasks: Task[];
  onTasksChange: () => void;
}

export default function TaskList({
  tasks,
  onTasksChange,
}: Props) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  if (tasks.length === 0) {
    return (
      <NoResultsState text="zadań" />
    );
  }

  return (
    <div className="space-y-4">
      {activeTask && (
        <TaskTimer
          task={activeTask}
          onComplete={() => {
            setActiveTask(null);
            onTasksChange(); 
          }}
        />
      )}
      <ul className="flex flex-wrap mt-6 gap-4 sm:gap-6">
        {tasks.map((task) => (
          <li key={task.id} className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
            <TaskItem
              task={task}
              onTasksChange={onTasksChange}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}