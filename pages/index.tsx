// pages/index.tsx

import React, { useEffect, useState } from "react";
import Seo from "@/components/ui/SEO";
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


export default function IndexPage() {
  const { user, loadingUser } = useAuth();
  const router = useRouter();
  const [viewDate, setViewDate] = useState(getAppDateTime());
  const { settings, loading: loadingSettings } = useSettings();

  function MainView({ view }: { view: string }) {
    if (view === 'tasks') return <TasksPage />;
    if (view === 'day_view') return <DayView date={viewDate} onDateChange={setViewDate} />;
    return <CalendarPage />;
  }
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
    <>
        <MainView view={settings.main_view} />
    </>
  )
}
