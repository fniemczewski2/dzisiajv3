import React, { useState } from "react";
import TaskItem from "./TaskItem";
import TaskTimer from "./TaskTimer";
import { Task } from "../../types";

interface Props {
  tasks: Task[];
  userEmail: string;
  onTasksChange: () => void;
  onEdit: (task: Task) => void;
}

export default function TaskList({
  tasks,
  userEmail,
  onTasksChange,
  onEdit,
}: Props) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

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
      <ul className="flex flex-wrap gap-2">
        {tasks.map((task) => (
          <li key={task.id} className="w-full md:w-[45%] lg:w-[30%]">
            <TaskItem
              task={task}
              userEmail={userEmail}
              onTasksChange={onTasksChange}
              onEdit={onEdit}
              onStartTimer={() => setActiveTask(task)} 
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
