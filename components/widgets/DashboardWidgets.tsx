import React from 'react';
import TaskIcons from "../widgets/HabbitIcons";
import WaterTracker from "../widgets/WaterTracker";
import DailySpendingForm from "../widgets/DailySpendingForm";
import TransportWidget from "../widgets/TransportWidget";

interface DashboardWidgetsProps {
  settings: any;
}

export const DashboardWidgets = React.memo(({ settings }: DashboardWidgetsProps) => {
  return (
    <div className="flex flex-col">
      {settings?.show_habits && <TaskIcons />}
      {settings?.show_water_tracker && <WaterTracker />}
      <DailySpendingForm />
      <TransportWidget />
    </div>
  );
});
DashboardWidgets.displayName = 'DashboardWidgets';