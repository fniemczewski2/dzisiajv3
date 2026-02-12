// components/dashboard/DraggableScheduledTask.tsx
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
      className={`cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}
    >
      {children}
    </div>
  );
}


