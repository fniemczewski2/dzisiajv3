// pages/index.tsx

import React, { useEffect } from "react";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import { useSettings } from "../hooks/useSettings";
import { useAuth } from "../providers/AuthProvider";

import LoadingState from "../components/LoadingState";
import { useRouter } from "next/router";
import DashboardPage from "./dashboard"
import CalendarPage from "./calendar";
import TasksPage from "./tasks";

export default function IndexPage() {
  const { user, loadingUser } = useAuth();
  const router = useRouter();
  const { settings, loading: loadingSettings } = useSettings();

  useEffect(() => {
    if (!loadingUser && !user) {
      router.replace("/start");
    }
  }, [user, loadingUser, router]);

  if (loadingUser || (user && loadingSettings)) {
    return <LoadingState fullScreen />;
  }

  // Auth resolved, no user → null while redirect fires
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
            return (<DashboardPage isMain/>)
          }
          default:{
            return (<CalendarPage isMain />)
          }
        }})()} 
    </>
  )
}
IndexPage.auth = true;