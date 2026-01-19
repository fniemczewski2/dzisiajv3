// pages/settings.tsx
"use client";

import React from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import { useSession } from "@supabase/auth-helpers-react";
import InstallButton from "../components/settings/InstallButton";
import LoadingState from "../components/LoadingState";
import VersionInfo from "../components/settings/Versioninfo";
import MenuGrid from "../components/settings/MenuGrid";
import SettingsForm from "../components/settings/SettingsForm";
import LocationSection from "../components/settings/LocationSection";
import UserSection from "../components/settings/UserSection";
import { useSettings } from "../hooks/useSettings";
import PushNotificationManager from '../components/settings/PushNotificationManager';

export default function SettingsPage() {
  const session = useSession();
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
  } = useSettings();

  return (
    <>
      <Head>
        <title>Menu - Dzisiaj</title>
        <meta name="description" content="Zmień swoje ustawienia aplikacji" />
      </Head>
      <Layout>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Menu</h2>
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
        />

        <PushNotificationManager userEmail={session?.user?.email}/>
        
        <LocationSection
          onRequestLocation={requestGeolocation}
          locationStatus={locationStatus}
        />
        
        <UserSection
          email={session?.user?.email}
          onSignOut={handleSignOut}
        />
        
        <VersionInfo />
      </Layout>
    </>
  );
}

SettingsPage.auth = true;