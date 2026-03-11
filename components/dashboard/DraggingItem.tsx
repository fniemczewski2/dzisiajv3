"use client";

import React from "react";
import { Task } from "../../types";
import { Calendar } from "lucide-react";

export const DraggingTaskItem = ({ task }: { task: Task }) => {
  const priorityColors = {
    1: { bg: "#fca5a5", text: "#B91C1C" },
    2: { bg: "#fdba74", text: "#B91C1C" },
    3: { bg: "#fde68a", text: "#A16207" },
    4: { bg: "#a7f3d0", text: "#15803D" },
    5: { bg: "#bbf7d0", text: "#15803D" },
  };

  const colors = priorityColors[task.priority as 1 | 2 | 3 | 4 | 5] || priorityColors[3];
  
  return (
    <div className="p-3 w-[260px] sm:w-[300px] bg-card border border-primary shadow-2xl rounded-xl opacity-90 cursor-grabbing z-50 flex items-center gap-3">
      <div
        className="w-8 h-8 text-sm font-bold rounded-md flex items-center justify-center shadow-sm shrink-0"
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
        }}
      >
        {task.priority}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-[15px] leading-snug font-bold text-text truncate">
          {task.title}
        </h3>
        {task.category && (
          <p className="text-[10px] text-textMuted font-bold uppercase tracking-wider mt-0.5">
            {task.category}
          </p>
        )}
      </div>
    </div>
  );
};

export const DraggingEventItem = ({title}:{title: string}) => {
  return (
    <div className="p-3 w-[260px] sm:w-[300px] bg-card border border-primary shadow-2xl rounded-xl opacity-90 cursor-grabbing z-50 text-text flex items-center gap-3">
      <Calendar className="w-4 h-4 text-primary" /> {title}
    </div>
  )
}