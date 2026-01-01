// components/tasks/DroppableKanbanColumn.tsx
"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";

const COLUMN_COLORS = {
  todo: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    hoverBorder: "border-blue-400",
    text: "text-blue-800",
  },
  in_progress: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    hoverBorder: "border-yellow-400",
    text: "text-yellow-800",
  },
  done: {
    bg: "bg-green-50",
    border: "border-green-200",
    hoverBorder: "border-green-400",
    text: "text-green-800",
  },
} as const;

export default function DroppableKanbanColumn({
  id,
  title,
  count,
  children,
}: {
  id: string;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const colors = COLUMN_COLORS[id as keyof typeof COLUMN_COLORS] || {
    bg: "bg-gray-50",
    border: "border-gray-200",
    hoverBorder: "border-gray-400",
    text: "text-gray-800",
  };

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[500px] ${colors.bg} rounded-xl p-4 shadow-md border-2 transition-all duration-200 ease-out
        ${isOver 
          ? `${colors.hoverBorder} shadow-lg scale-[1.02] bg-opacity-80` 
          : `${colors.border} hover:shadow-lg`
        }`}
    >
      <h3 className={`text-lg font-bold mb-1 ${colors.text}`}>
        {title}
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        {count} {count === 1 ? "zadanie" : count < 5 ? "zadania" : "zadań"}
      </p>
      <div className="space-y-3 min-h-[400px]">
        {children}
      </div>
    </div>
  );
}