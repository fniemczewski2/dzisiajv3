// components/dashboard/StaticTaskItem.tsx
import React from "react";
import { Task } from "../../types";

export const StaticTaskItem = ({ task }: { task: Task }) => {
  const priorityColors = {
    1: { bg: "#fca5a5", text: "#B91C1C"},
    2: { bg: "#fdba74", text: "#B91C1C" },
    3: { bg: "#fde68a", text: "#A16207" },
    4: { bg: "#a7f3d0", text: "#15803D" },
    5: { bg: "#bbf7d0", text: "#15803D" },
  };

  const colors = priorityColors[task.priority as 1 | 2 | 3 | 4 | 5] || priorityColors[3];
  
  return (
    <div className="p-3 w-[300px] bg-white border-2 border-blue-500 shadow-2xl rounded-xl opacity-90 cursor-grabbing z-50 flex items-center gap-3">
      <div
        className="w-8 h-8 text-sm font-bold rounded-md flex items-center justify-center shadow-sm shrink-0"
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
        }}
      >
        {task.priority}
      </div>
      <div className="overflow-hidden">
        <h3 className="text-sm font-bold truncate">{task.title}</h3>
        <p className="text-[10px] text-gray-500 uppercase">{task.category}</p>
      </div>
    </div>
  );
};

