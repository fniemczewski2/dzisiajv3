// pages/index.tsx

import React, { useEffect } from "react";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
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

  const homepageStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Dzisiaj v3",
    description: "Kompleksowa aplikacja do zarządzania czasem i produktywnością.",
    url: "https://dzisiajv3.vercel.app",
  };

  return (
    <>
      <SEO
        title="Dzisiaj v3 - Zarządzaj Zadaniami, Notatkami i Kalendarzem"
        structuredData={homepageStructuredData}
      />
        {(() => {switch(settings.main_view){
          case "tasks":{
            return (<TasksPage isMain />)
          }
          case "day_view":{
            return (
            <>
              <SEO title="Dzisiaj v3 - Twój główny pulpit" />
              <Layout>
                <DayView date={todayDate} isMain />
              </Layout>
            </>)
          }
          default:{
            return (<CalendarPage isMain />)
          }
        }})()} 
    </>
  )
}
