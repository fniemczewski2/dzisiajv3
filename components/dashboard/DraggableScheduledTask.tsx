"use client";

import { useDraggable } from '@dnd-kit/core';
import { Task } from "../../types";

export function DraggableScheduledTask({ task, children }: { task: Task, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `scheduled-task-${task.id}`,
    data: { task, isScheduled: true }
  });

  return (
    <div 
      ref={setNodeRef} 
      {...listeners} 
      {...attributes} 
      style={{ touchAction: 'none' }} // KRYTYCZNE: Zapobiega przewijaniu strony palcem podczas przeciągania elementu na urządzeniach mobilnych
      className={`
        cursor-grab active:cursor-grabbing transition-all duration-200
        ${isDragging ? 'opacity-40 scale-[0.98] shadow-inner' : 'opacity-100 scale-100'}
      `}
    >
      {children}
    </div>
  );
}