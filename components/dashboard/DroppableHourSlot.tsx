// components/dashboard/DroppableHourSlot.tsx

import React from "react";
import { useDroppable } from "@dnd-kit/core";

export function DroppableHourSlot({ time, children }: Readonly<{ time: string; children: React.ReactNode }>) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${time}`,
    data: { time },
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative min-h-12 rounded-lg transition-colors duration-200 ${isOver && "bg-info-soft ring-2 ring-primary ring-inset"} `}
    >
      <div className="pointer-events-none absolute top-3 left-0 text-center text-xs font-semibold text-text-muted select-none">
        {time}
      </div>
      <div className="ml-12 flex min-h-16 flex-col justify-center p-0 sm:px-2">
        <div className="relative z-10">{children}</div>
        {React.Children.count(children) === 0 && (
          <div
            className={`mt-1 flex h-10 items-center justify-center rounded-lg border-2 border-dashed border-line text-xs text-text-muted transition-opacity ${isOver ? "opacity-0" : "opacity-100"}`}
          />
        )}
      </div>
    </div>
  );
}
