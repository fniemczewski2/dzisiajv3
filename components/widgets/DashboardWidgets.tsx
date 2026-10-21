// components/widgets/DashboardWidgets.tsx

import React from "react";
import TaskIcons from "./HabitIcons";
import WaterTracker from "./WaterTracker";
import DailySpendingForm from "./DailySpendingForm";
import MoodWidget from "./MoodTracker";
import { getAppDate } from "@/lib/dateUtils";
import { Settings } from "@/types/settings";
import LoadingState from "../ui/LoadingState";
import { isPathEnabled } from "@/config/modules";

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
      {settings?.show_habits && <TaskIcons date={date} />}

      <div className="flex flex-row items-center justify-between gap-2">
        {settings?.show_water_tracker && <WaterTracker date={date} />}
        {isPathEnabled("/bills", settings.disabled_modules) && <DailySpendingForm date={date} />}
      </div>
      {settings?.show_mood_tracker && <MoodWidget date={date || today} />}
    </div>
  );
});
DashboardWidgets.displayName = "DashboardWidgets";
