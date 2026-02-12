// components/dashboard/DraggableTask.tsx
"use client";

import React, { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Task } from "../../types";
import { parseISO, format, addDays } from "date-fns";
import { Clock, Calendar as CalendarIcon, Check } from "lucide-react";
import TimeContextBadge from "../tasks/TimeContextBadge";
import { DeleteButton, RescheduleButton } from "../CommonButtons";
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
    const [showCelebration, setShowCelebration] = useState(false);
    const { fetchTasks, deleteTask, setDoneTask, editTask } = useTasks();
    const CELEBRATION_MS = 2500;
    const handleDelete = async () => {
      if (!confirm("Czy na pewno chcesz usunąć to zadanie?")) return;
      await deleteTask(task.id);
      await fetchTasks();
      onTasksChange();
    };
  
    const handleComplete = async () => {
      await setDoneTask(task.id);
      setShowCelebration(true);
  
      setTimeout(async () => {
        setShowCelebration(false); 
        try {
          await fetchTasks();
        } catch (err) {
          console.error("Fetch tasks error", err);
        }
      }, CELEBRATION_MS);
      onTasksChange();
    };
  
    const handleReschedule = async (days: number) => {
      setIsRescheduling(true);
      const currentDate = parseISO(task.due_date);
      const newDate = format(addDays(currentDate, days), "yyyy-MM-dd");
      
      await editTask({
        ...task,
        due_date: newDate,
      });
      
      await fetchTasks();
      onTasksChange();
      setIsRescheduling(false);
    };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`p-4 bg-white rounded-xl shadow-sm border border-gray-200
        select-none cursor-grab active:cursor-grabbing 
        hover:shadow-md hover:border-gray-300 transition-all duration-200
        ${isDragging ? "opacity-30 scale-95 shadow-xl" : ""}`}
    >
      {/* Top section: Priority badge + Title */}
      <div className="flex items-start gap-3 mb-2">
        <span
          className="w-6 h-6 text-sm font-bold rounded-md flex items-center justify-center shadow-sm transition duration-200 hover:shadow hover:brightness-110 shrink-0"
          style={{
            backgroundColor: colors.bg,
            color: colors.text,
          }}
          title={`Priorytet ${task.priority}`}
        >
          {task.priority}
        </span>

        <div className="flex-1 min-w-0 items-center h-full">
          <h3 className="font-semibold text-lg text-gray-900 break-words leading-tight items-center h-full">
            {task.title}
          </h3>
        </div>
      </div>

      {/* Bottom section: Category + Due Date */}
      <div className="flex items-center gap-3 text-xs text-gray-500 ml-8">
        <TimeContextBadge dueDate={task.due_date} isDone={task.status === 'done' || task.status === 'completed'} small={true}/>
        {task.category && (
            <span className="px-2 py-1 bg-gray-100 rounded-md uppercase font-medium">
              {task.category}
            </span>
          )}
      </div>

      {task.description && (
        <p className="mt-2 text-xs text-gray-600 line-clamp-2 ml-11">
          {task.description}
        </p>
      )}
      <div className="flex justify-end w-full gap-1.5 flex-wrap">
        <button
          onClick={handleComplete}
          className="flex flex-col px-1.5 items-center justify-center rounded-lg text-green-600 hover:text-green-800 transition-colors"
        >
          <Check className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[9px] sm:text-[11px]">Zrobione</span>
        </button>
        <RescheduleButton onClick={() => handleReschedule(1)} loading={isRescheduling} />
        <DeleteButton onClick={handleDelete} />
      </div>
    </div>
  );
}