// components/dashboard/DailyPlan.tsx

import React from "react";
import { DroppableHourSlot } from "./DroppableHourSlot";
import { DraggablePlanItem } from "./DraggablePlanItem";
import { PlanItem } from "./PlanItem";
import { PlanItemData } from "@/types/schemas";

interface DailyPlanProps {
  planByHour: Record<string, PlanItemData[]>;
  handleMarkAsDone: (id: string) => void;
  handleRemoveFromSchedule: (id: string) => void;
}

export const DailyPlan = React.memo(
  ({ planByHour, handleMarkAsDone, handleRemoveFromSchedule }: Readonly<DailyPlanProps>) => {
    const visibleHours = Object.keys(planByHour).sort((a, b) => a.localeCompare(b));

    return (
      <section className="lg:col-span-2">
        <div className="relative">
          <div className="relative z-10 space-y-1">
            {visibleHours.map((timeKey) => {
              const items = planByHour[timeKey] || [];

              return (
                <DroppableHourSlot key={timeKey} time={timeKey}>
                  {items.map((item) => (
                    <DraggablePlanItem
                      key={`${item.type}-${item.id}`}
                      id={`plan-${item.type}-${item.id}`}
                      type={item.type}
                    >
                      <PlanItem
                        item={item}
                        onMarkAsDone={handleMarkAsDone}
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
  }
);

DailyPlan.displayName = "DailyPlan";
