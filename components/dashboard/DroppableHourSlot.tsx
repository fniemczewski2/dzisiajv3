"use client";

import React from "react";
import { useDroppable } from '@dnd-kit/core';

export function DroppableHourSlot({ time, children }: { time: string, children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${time}`,
    data: { time }
  });

  return (
    <div 
      ref={setNodeRef} 
      className={`relative min-h-[3rem] transition-colors duration-200 rounded-lg
        ${isOver && 'bg-blue-100 dark:bg-blue-900/70 ring-inset ring-2 ring-primary'}
      `}
    >
      <div className="absolute left-0 top-3 text-xs font-semibold text-textMuted w-12 text-center pointer-events-none select-none">
        {time}
      </div>
      <div className="ml-12 sm:px-2 p-0 min-h-lg flex flex-col justify-center">
        <div className="relative z-10">
          {children}
        </div>
        {React.Children.count(children) === 0 && (
          <div className={`h-10 mt-1 border-2 border-dashed border-gray-200 dark:border-gray-700/50 rounded-lg flex items-center justify-center text-xs text-textMuted transition-opacity ${isOver ? 'opacity-0' : 'opacity-100'}`}/>
        )}
      </div>
    </div>
  );
}