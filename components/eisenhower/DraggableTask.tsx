"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { Task } from "../../types";
import { parseISO, format } from "date-fns";

export function DraggableTask({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-2 bg-white rounded shadow-sm text-sm touch-none select-none cursor-move hover:bg-zinc-50 transition ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex flex-nowrap gap-2 items-center mb-1">
      <span
          className={`w-6 h-6 text-sm font-bold rounded-md flex items-center justify-center shadow-sm cursor-pointer transition duration-200`}
          style={{
            backgroundColor:
              task.priority === 1
                ? "#fca5a5" // pastel red
                : task.priority === 2
                ? "#fdba74" // pastel orange
                : task.priority === 3
                ? "#fde68a" // pastel yellow
                : task.priority === 4
                ? "#a7f3d0" // pastel teal-green
                : "#bbf7d0", // pastel green
            color:
              task.priority === 3 
                ? "#A16207"
                : task.priority >= 3
                ? "#15803D"
                : "#B91C1C" // darker red text for high priority
          }}
          title={`Priorytet ${task.priority}`}
        >
          {task.priority}
        </span>

        <h3
          className="text-lg font-semibold break-words"
        >
          {task.title}
        </h3>
      </div>
      <div className="text-xs text-gray-500">
        {task.deadline_date &&
          format(parseISO(task.deadline_date), "dd.MM.yyyy")}
      </div>
    </li>
  );
}
