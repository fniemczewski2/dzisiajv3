// pages/settings.tsx
import React from "react";
import InstallButton from "@/components/settings/InstallButton";
import LoadingState from "@/components/ui/LoadingState";
import VersionInfo from "@/components/settings/Versioninfo";
import MenuGrid from "@/components/settings/MenuGrid";
import SettingsForm from "@/components/settings/SettingsForm";
import LocationSection from "@/components/settings/LocationSection";
import UserSection from "@/components/settings/UserSection";
import { useSettings } from "@/hooks/db/useSettings";
import PushNotificationManager from '@/components/settings/PushNotificationManager';
import LoveButton from "@/components/settings/LoveButton";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { Settings } from "@/types/settings"; 
import Seo from "@/components/ui/SEO";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const {
    settings,
    loading,
    locationStatus,
    updateSettings,
    requestGeolocation,
    handleSignOut,
    DEFAULT_SETTINGS 
  } = useSettings();

  const handleSave = async (updatedData: Settings) => {
    await updateSettings(updatedData);
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
      <Seo
        title="Ustawienia | Dzisiaj.Fun"
        description="Dostosuj działanie aplikacjiDzisiaj.Fun. Zmień preferencje, powiadomienia i wygląd interfejsu."
        canonical="https://dzisiaj.fun/settings"
        keywords="ustawienia, konfiguracja, personalizacja, profil, motyw"
        noindex={true} 
      />
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
            loading={loading}
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
    </>
  );
}
