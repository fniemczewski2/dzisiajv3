// components/dashboard/DroppableHourSlot.tsx
import React from "react";
import { useDroppable } from '@dnd-kit/core';
import { Plus } from "lucide-react";

export function DroppableHourSlot({ time, children }: { time: string, children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${time}`,
    data: { time }
  });

  return (
    <div 
      ref={setNodeRef} 
      className={`relative min-h-[5rem] border-b border-gray-100 last:border-0 transition-colors duration-200 
        ${isOver ? 'bg-blue-50 ring-inset ring-2 ring-blue-400' : 'hover:bg-gray-50/50'}
      `}
    >
      {/* Hour Label */}
      <div className="absolute left-0 top-3 text-xs font-semibold text-gray-400 w-12 text-center pointer-events-none select-none">
        {time}
      </div>

      {/* Content Area */}
      <div className="ml-14 pl-2 pr-2 py-2 min-h-[5rem] flex flex-col justify-center">
        <div className="relative z-10">
          {children}
        </div>
        {/* Visual hint for empty slot */}
        {React.Children.count(children) === 0 && (
          <div className={`h-10 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-300 transition-opacity ${isOver ? 'opacity-0' : 'opacity-100'}`}>
            <Plus size={14} className="mr-1"/> Upuść zadanie tutaj
          </div>
        )}
      </div>
    </div>
  );
}