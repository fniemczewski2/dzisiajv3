// pages/index.tsx

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSettings } from "@/hooks/db/useSettings";
import { useAuth } from "@/providers/AuthProvider";

import LoadingState from "@/components/ui/LoadingState";
import { SkeletonTaskList, SkeletonCalendar, SkeletonRow } from "@/components/ui/Skeleton";
import { useRouter } from "next/router";
import { getAppDateTime } from "@/lib/dateUtils";

function DayViewSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <SkeletonRow />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SkeletonTaskList count={4} />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-3">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    </div>
  );
}

const TasksPage = dynamic(() => import("./tasks"), {
  loading: () => <SkeletonTaskList count={6} />,
});
const CalendarPage = dynamic(() => import("./calendar"), {
  loading: () => <SkeletonCalendar />,
});
const DayView = dynamic(() => import("../components/dashboard/DayView"), {
  loading: () => <DayViewSkeleton />,
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
  const { settings, fetching: fetchingSettings } = useSettings();

  useEffect(() => {
    if (!loadingUser && !user) {
      router.replace("/start");
    }
  }, [user, loadingUser, router]);

  if (loadingUser || (user && fetchingSettings)) {
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