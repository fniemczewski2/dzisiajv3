import React from "react";
import TaskItem from "./TaskItem";
import { Task } from "../../types";
import NoResultsState from "../NoResultsState";

interface Props {
  tasks: Task[];
  acceptTask: (id: string) => void;
  setDoneTask: (id: string) => void;
  editTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  onTasksChange: () => void;
  userId: string;
  userOptions: string[];
}

export default function TaskList({
  tasks,
  acceptTask,
  setDoneTask,
  editTask,
  deleteTask,
  onTasksChange,
  userId,
  userOptions
}: Readonly<Props>) {

  if (tasks.length === 0) {
    return (
      <NoResultsState text="zadań" />
    );
  }

  return (
    <div className="space-y-4">
      <ul className="flex flex-wrap mt-6 gap-4 sm:gap-6">
        {tasks.map((task) => (
          <li key={task.id} className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
            <TaskItem
              task={task}
              acceptTask={acceptTask}
              setDoneTask={setDoneTask}
              editTask={editTask}
              deleteTask={deleteTask}
              onTasksChange={onTasksChange}
              userId={userId}
              userOptions={userOptions}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}