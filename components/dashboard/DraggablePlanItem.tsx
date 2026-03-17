"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";

interface DraggablePlanItemProps {
  id: string; 
  type: 'event' | 'schema' | 'task';
  children: React.ReactNode;
}

export function DraggablePlanItem({ id, type, children }: DraggablePlanItemProps) {
  const isDraggable = type === 'task' || type === 'event';

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
      {/* Przenosimy isDragging (scale i opacity) oraz transition na wewnętrzny element. 
          Dzięki temu dnd-kit prawidłowo namierzy pozycję kursora z zewnętrznego diva! */}
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