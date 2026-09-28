// components/dashboard/DraggablePlanItem.tsx

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import type { PlanItemType } from "@/types/schemas";

interface DraggablePlanItemProps {
  id: string; 
  type: PlanItemType;
  children: React.ReactNode;
}

export function DraggablePlanItem({ id, type, children }: Readonly<DraggablePlanItemProps>) {
  const isDraggable = type === 'task' || type === 'event' || type === 'schema';

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: id,
    disabled: !isDraggable,
    data: { type },
  });

  return (
    <div
      ref={setNodeRef}
      {...(isDraggable ? attributes : {})}
      {...(isDraggable ? listeners : {})}
      style={{ touchAction: isDraggable ? 'none' : 'auto' }}
      className={`${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div 
        className={`relative pointer-events-auto transition-all duration-200 ${
          isDragging ? 'opacity-40 scale-[0.98]' : 'opacity-100 scale-100'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
