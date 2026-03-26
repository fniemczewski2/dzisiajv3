import React from "react";
import { Calendar } from "lucide-react";
import { DroppableHourSlot } from "./DroppableHourSlot";
import { DraggablePlanItem } from "./DraggablePlanItem";
import { PlanItem } from "./PlanItem";

// USUNIĘTO stałą HOURS

interface DailyPlanProps {
  planByHour: Record<string, any[]>;
  handleMarkAsDone: (id: string) => void;
  handleDeleteTask: (id: string) => void;
  handleRemoveFromSchedule: (id: string) => void;
  handleDeleteEvent: (id: string) => void;
}

export const DailyPlan = React.memo(({
  planByHour,
  handleMarkAsDone,
  handleRemoveFromSchedule,
}: Readonly<DailyPlanProps>) => {

  const visibleHours = Object.keys(planByHour).sort((a, b) => a.localeCompare(b));

  return (
    <section className="lg:col-span-2 card rounded-xl p-4">
      <h2 className="text-xl font-bold text-text mb-6 flex items-center gap-3 pb-3 px-2 border-b border-gray-100 dark:border-gray-700">
        <div className="rounded-xl">
          <Calendar className="text-primary w-5 h-5" />
        </div>
        Plan Dnia
      </h2>

      <div className="relative">
        <div className="space-y-2 relative z-10">
          {visibleHours.map((timeKey) => {
            const items = planByHour[timeKey] || [];

            return (
              <DroppableHourSlot key={timeKey} time={timeKey}>
                {items.map((item, idx) => (
                  <DraggablePlanItem
                    key={`${item.id}-${idx}`}
                    id={`plan-${item.type}-${item.id}`}
                    type={item.type}
                  >
                    <PlanItem
                      item={item}
                      onMarkAsDoneTask={handleMarkAsDone}
                      onRemoveFromSchedule={handleRemoveFromSchedule}
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

DailyPlan.displayName = "DailyPlan";