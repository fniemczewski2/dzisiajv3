"use client";

import React, { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Task } from "../../types";
import { parseISO, format, addDays } from "date-fns";
import { Check, Trash2 } from "lucide-react";
import TimeContextBadge from "../tasks/TimeContextBadge";
import { useTasks } from "../../hooks/useTasks";

interface DraggableTaskProps {
  task: Task;
  onTasksChange: () => void;
}

export default function DraggableTask({ task, onTasksChange }: DraggableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({ 
    id: `task-${task.id}`,
    data: { task, isScheduled: false }
  });

  const priorityColors = {
    1: { bg: "#fca5a5", text: "#B91C1C" },
    2: { bg: "#fdba74", text: "#B91C1C" },
    3: { bg: "#fde68a", text: "#A16207" },
    4: { bg: "#a7f3d0", text: "#15803D" },
    5: { bg: "#bbf7d0", text: "#15803D" },
  };

  const colors = priorityColors[task.priority as 1 | 2 | 3 | 4 | 5] || priorityColors[3];

  const [isRescheduling, setIsRescheduling] = useState(false);
  const { fetchTasks, deleteTask, setDoneTask, editTask } = useTasks();
  
  const handleDelete = async () => {
    if (!confirm("Czy na pewno chcesz usunąć to zadanie?")) return;
    await deleteTask(task.id);
    await fetchTasks();
    onTasksChange();
  };

  const handleComplete = async () => {
    await setDoneTask(task.id);
    setTimeout(async () => {
      try {
        await fetchTasks();
      } catch (err) {
        console.error("Fetch tasks error", err);
      }
    }, 1000);
    onTasksChange();
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ touchAction: 'none' }}
      className={`p-3 bg-card rounded-xl shadow-sm border border-gray-200 dark:border-gray-800
        select-none cursor-grab active:cursor-grabbing flex flex-row items-center justify-between gap-2
        hover:shadow-md transition-all duration-200
        ${isDragging ? "opacity-40 shadow-inner scale-[0.98]" : "opacity-100 scale-100"}`}
    >
      {/* Lewa strona - informacje o zadaniu */}
      <div className="flex flex-col flex-1 min-w-0 gap-2">
        <div className="flex items-start gap-2.5">
          <span
            className="w-5 h-5 shrink-0 mt-0.5 text-[11px] font-bold rounded flex items-center justify-center shadow-sm"
            style={{
              backgroundColor: colors.bg,
              color: colors.text,
            }}
            title={`Priorytet ${task.priority}`}
          >
            {task.priority}
          </span>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight text-text break-words">
              {task.title}
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <TimeContextBadge 
            dueDate={task.due_date} 
            isDone={task.status === 'done' || task.status === 'completed'} 
            small={true}
          />
        </div>
      </div>

      {/* Prawa strona - Małe przyciski akcji (Zawsze w tej samej linii) */}
      <div className="flex items-center gap-1.5 shrink-0 z-10" onPointerDown={(e) => e.stopPropagation()}>
        <button
          onClick={(e) => { e.stopPropagation(); handleComplete(); }}
          className="flex items-center justify-center w-[30px] h-[30px] rounded-lg bg-green-50 dark:bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/30 transition-colors border border-green-200 dark:border-green-500/30"
          title="Zrobione"
        >
          <Check className="w-4 h-4" />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); handleDelete(); }}
          className="flex items-center justify-center w-[30px] h-[30px] rounded-lg bg-surface hover:bg-red-50 dark:hover:bg-red-900/20 text-textMuted hover:text-red-500 transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900/30"
          title="Usuń"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}