// pages/index.tsx

import React, { useEffect } from "react";
import Seo from "../components/SEO";
import { useSettings } from "../hooks/useSettings";
import { useAuth } from "../providers/AuthProvider";

import LoadingState from "../components/LoadingState";
import { useRouter } from "next/router";
import CalendarPage from "./calendar";
import TasksPage from "./tasks";
import { getAppDateTime } from "../lib/dateUtils";
import DayView from "../components/dashboard/DayView";

export default function IndexPage() {
  const { user, loadingUser } = useAuth();
  const router = useRouter();
  const todayDate = getAppDateTime();
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
    <>
        {(() => {switch(settings.main_view){
          case "tasks":{
            return (<TasksPage />)
          }
          case "day_view":{
            return (
              <>
                <Seo 
                  title="Twój Plan Dnia - Dzisiaj v3"
                  description="Zarządzaj dzisiejszymi zadaniami, nawykami i planem dnia w jednym miejscu. Sprawdź postępy i zoptymalizuj swoją produktywność."
                  canonical="https://dzisiajv3.vercel.app/"
                  keywords="planner, plan dnia, produktywność, dashboard, zarządzanie czasem"
                />
                <DayView date={todayDate} isMain />
              </>
            )
          }
          default:{
            return (<CalendarPage />)
          }
        }})()} 
    </>
  )
}
