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

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    settings,
    setSettings,
    loading,
    saving,
    locationStatus,
    addUser,
    removeUser,
    updateUser,
    saveSettings,
    requestGeolocation,
    handleSignOut,
    updateSettings,
    DEFAULT_SETTINGS
  } = useSettings();

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
        
        {loading && <LoadingState />}
        
        <MenuGrid />
        
        <SettingsForm
          settings={settings}
          saving={saving}
          onSettingsChange={setSettings}
          onAddUser={addUser}
          onRemoveUser={removeUser}
          onUpdateUser={updateUser}
          onSave={saveSettings}
          onRestoreDefaults={async () => {
            const ok = await toast.confirm(
              "Czy na pewno chcesz przywrócić domyślne ustawienia? Zmiany zostaną od razu zapisane."
            );
            if (!ok) return;
            setSettings(DEFAULT_SETTINGS);
            updateSettings(DEFAULT_SETTINGS);
          }}
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
      </Layout>
    </>
  );
}

SettingsPage.auth = true;
