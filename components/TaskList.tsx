import React from "react";
import TaskItem from "./TaskItem";
import { Task } from "../types";

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
  return (
    <ul className="flex flex-wrap">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          userEmail={userEmail}
          onTasksChange={onTasksChange}
          onEdit={onEdit}
        />
      ))}
    </ul>
  );
}
