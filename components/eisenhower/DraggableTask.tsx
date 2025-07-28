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
      className={`p-2 bg-white rounded shadow-sm text-sm cursor-move hover:bg-zinc-50 transition ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="font-semibold">{task.title}</div>
      <div className="text-xs text-gray-500">
        {task.deadline_date &&
          format(parseISO(task.deadline_date), "dd.MM.yyyy")}
        {" • "}
        Priorytet {task.priority}
      </div>
    </li>
  );
}
