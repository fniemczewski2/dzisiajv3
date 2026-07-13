// pages/index.tsx

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/providers/AuthProvider";

import LoadingState from "@/components/ui/LoadingState";
import { useRouter } from "next/router";
import { getAppDateTime } from "@/lib/dateUtils";

const TasksPage = dynamic(() => import("./tasks"), {
  loading: () => <LoadingState fullScreen />,
});
const CalendarPage = dynamic(() => import("./calendar"), {
  loading: () => <LoadingState fullScreen />,
});
const DayView = dynamic(() => import("../components/dashboard/DayView"), {
  loading: () => <LoadingState fullScreen />,
});

interface MainViewProps {
  readonly view: string;
  readonly viewDate: ReturnType<typeof getAppDateTime>;
  readonly onDateChange: React.Dispatch<React.SetStateAction<ReturnType<typeof getAppDateTime>>>;
}

function MainView({ view, viewDate, onDateChange }: MainViewProps) {
  if (view === 'tasks') return <TasksPage />;
  if (view === 'day_view') return <DayView date={viewDate} onDateChange={onDateChange} />;
  return <CalendarPage />;
}

export default function IndexPage() {
  const { user, loadingUser } = useAuth();
  const router = useRouter();
  const [viewDate, setViewDate] = useState(getAppDateTime());
  const { settings, loading: loadingSettings } = useSettings();

  useEffect(() => {
    if (!loadingUser && !user) {
      router.replace("/start");
    }
  }, [user, loadingUser, router]);

  if (loadingUser || (user && loadingSettings)) {
    return <LoadingState fullScreen />;
  }

  if (!user) return null;

  return (
    <MainView 
      view={settings.main_view} 
      viewDate={viewDate} 
      onDateChange={setViewDate} 
    />
  );
}