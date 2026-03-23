// pages/settings.tsx
import React from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import InstallButton from "../components/settings/InstallButton";
import LoadingState from "../components/LoadingState";
import VersionInfo from "../components/settings/Versioninfo";
import MenuGrid from "../components/settings/MenuGrid";
import SettingsForm from "../components/settings/SettingsForm";
import LocationSection from "../components/settings/LocationSection";
import UserSection from "../components/settings/UserSection";
import { useSettings } from "../hooks/useSettings";
import PushNotificationManager from '../components/settings/PushNotificationManager';
import LoveButton from "../components/settings/LoveButton";
import { useAuth } from "../providers/AuthProvider";
import { useToast } from "../providers/ToastProvider";
import { Settings } from "../types"; 

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const {
    settings,
    loading,
    saving,
    locationStatus,
    updateSettings,
    requestGeolocation,
    handleSignOut,
    DEFAULT_SETTINGS 
  } = useSettings();

  const handleSave = async (updatedData: Settings) => {
    const { error } = await updateSettings(updatedData);
    if (!error) {
      toast.success("Zapisano ustawienia!");
    } else {
      toast.error("Wystąpił błąd podczas zapisywania.");
    }
  };
  const handleRestoreDefaults = async () => {
    const ok = await toast.confirm(
      "Czy na pewno chcesz przywrócić domyślne ustawienia? Zmiany zostaną od razu zapisane."
    );
    if (!ok) return;
    const { error } = await updateSettings(DEFAULT_SETTINGS);
    
    if (!error) {
      toast.success("Przywrócono domyślne ustawienia!");
    }
  };

  return (
    <>
      <Head>
        <title>Menu - Dzisiaj</title>
        <meta name="description" content="Zmień swoje ustawienia aplikacji" />
      </Head>
      <Layout>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">
            Menu&nbsp;&nbsp;
            <LoveButton/>
          </h2>
          <InstallButton />
        </div>
        {loading ? 
        <LoadingState fullScreen /> 
        : (
        <>
          
          <MenuGrid />
          
          <SettingsForm
            settings={settings}
            saving={saving}
            onSave={handleSave} 
            onRestoreDefaults={handleRestoreDefaults}
          />

          <PushNotificationManager userId={user?.id}/>
          
          <LocationSection
            onRequestLocation={requestGeolocation}
            locationStatus={locationStatus}
          />
          
          <UserSection
            email={user?.email}
            onSignOut={handleSignOut}
          />
          
          <VersionInfo />
        </>
      )}
      </Layout>
    </>
  );
}
