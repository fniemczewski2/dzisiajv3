import React from 'react';
import { Calendar } from 'lucide-react';
import { DroppableHourSlot } from './DroppableHourSlot';
import { DraggablePlanItem } from './DraggablePlanItem';
import { PlanItem } from './PlanItem';

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 - 23:00

interface DailyPlanProps {
  planByHour: Record<string, any[]>;
  handleMarkAsDone: (id: string) => void;
  handleDeleteTask: (id: string) => void;
  handleRemoveFromSchedule: (id: string) => void;
  handleDeleteEvent: (id: string) => void;
}

export const DailyPlan = React.memo(({
  planByHour, handleMarkAsDone, handleDeleteTask, handleRemoveFromSchedule, handleDeleteEvent
}: DailyPlanProps) => {
  return (
    <section className="lg:col-span-2 card rounded-3xl px-2 py-4 sm:p-4 shadow-sm">
      <h2 className="text-xl font-bold text-text mb-6 flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="rounded-xl">
          <Calendar className="text-primary w-5 h-5" /> 
        </div>
        Plan Dnia
      </h2>
      
      <div className="relative">
        <div className="space-y-2 relative z-10">
          {HOURS.map((h) => {
            const timeKey = `${String(h).padStart(2, '0')}:00`;
            const items = planByHour[timeKey] || [];

            return (
              <DroppableHourSlot key={timeKey} time={timeKey}>
                {items.map((item, idx) => (
                  <DraggablePlanItem key={`${item.id}-${idx}`} id={`plan-${item.type}-${item.id}`} type={item.type}>
                    <PlanItem
                      item={item}
                      onMarkAsDoneTask={handleMarkAsDone}
                      onDeleteTask={handleDeleteTask}
                      onRemoveFromSchedule={handleRemoveFromSchedule}
                      onDeleteEvent={handleDeleteEvent}
                    />
                  </DraggablePlanItem>
                ))}
              </DroppableHourSlot>
            );
          })}
        </div>
      </div>
    </section>
  );
});
DailyPlan.displayName = 'DailyPlan';