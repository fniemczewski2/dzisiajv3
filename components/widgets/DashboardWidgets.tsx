import React from 'react';
import TaskIcons from "../widgets/HabbitIcons";
import WaterTracker from "../widgets/WaterTracker";
import DailySpendingForm from "../widgets/DailySpendingForm";
import MoodWidget from './MoodTracker';
import { getAppDate } from '../../lib/dateUtils';

interface DashboardWidgetsProps {
  settings: any;
}

export const DashboardWidgets = React.memo(({ settings }: Readonly<DashboardWidgetsProps>) => {
  const today = getAppDate();
  return (
    <div className="flex flex-col">
      {settings?.show_habits && <TaskIcons />}
      {settings?.show_water_tracker && <WaterTracker />}
      {settings?.show_mood_tracker && <MoodWidget date={today}/>}
      <DailySpendingForm />
    </div>
  );
});
DashboardWidgets.displayName = 'DashboardWidgets';