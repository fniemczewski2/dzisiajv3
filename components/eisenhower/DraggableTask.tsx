"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "../../types";
import { parseISO, format } from "date-fns";

export default function DraggableTask({ task }: { task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-3 bg-white rounded-lg shadow-sm text-sm touch-none select-none cursor-grab active:cursor-grabbing 
        hover:shadow-md hover:scale-[1.02] transition-all duration-200 ease-out
        ${isDragging ? "z-50 shadow-xl" : ""}`}
    >
      <div className="flex flex-nowrap gap-2 items-center mb-1">
        <span
          className="w-6 h-6 text-sm font-bold rounded-md flex items-center justify-center shadow-sm transition-transform duration-200 hover:scale-110"
          style={{
            backgroundColor:
              task.priority === 1
                ? "#fca5a5"
                : task.priority === 2
                ? "#fdba74"
                : task.priority === 3
                ? "#fde68a"
                : task.priority === 4
                ? "#a7f3d0"
                : "#bbf7d0",
            color:
              task.priority === 3 
                ? "#A16207"
                : task.priority >= 3
                ? "#15803D"
                : "#B91C1C"
          }}
          title={`Priorytet ${task.priority}`}
        >
          {task.priority}
        </span>

        <h3 className="text-base font-semibold break-words flex-1">
          {task.title}
        </h3>
      </div>
      
      {task.due_date && (
        <div className="text-xs text-gray-500 mt-1 ml-8">
          {format(parseISO(task.due_date), "dd.MM.yyyy")}
        </div>
      )}
    </li>
  );
}
