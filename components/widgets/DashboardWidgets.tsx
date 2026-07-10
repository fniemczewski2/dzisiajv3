import React from 'react';
import TaskIcons from "./HabitIcons";
import WaterTracker from "./WaterTracker";
import DailySpendingForm from "./DailySpendingForm";
import MoodWidget from './MoodTracker';
import { getAppDate } from '@/lib/dateUtils';
import { Settings } from '@/types';
import LoadingState from '../ui/LoadingState';

interface DashboardWidgetsProps {
  settings: Settings;
  loading: boolean;
  date?: string;
}

export const DashboardWidgets = React.memo(({ settings, loading, date }: Readonly<DashboardWidgetsProps>) => {
  const today = getAppDate();
  if (!settings) return null; 
  if (loading) return <LoadingState />;
  return (
    <div className="flex flex-col">
      {settings?.show_habits && <TaskIcons date={date}/>}
      {settings?.show_water_tracker && <WaterTracker date={date}/>}
      {settings?.show_mood_tracker && <MoodWidget date={date || today}/>}
      <DailySpendingForm date={date} />
    </div>
  );
});
DashboardWidgets.displayName = 'DashboardWidgets';