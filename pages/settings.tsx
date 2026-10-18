// pages/settings.tsx
//
// Ustawienia w sekcjach tematycznych. Sekcje-formularze (Ogólne, Zadania,
// Nawyki, Finanse, Sortowanie, Udostępnianie) zapisują się osobno; pozostałe
// (powiadomienia, szablony, integracje, konto) zapisują zmiany od razu.

import { DEFAULT_SETTINGS } from "@/config/defaults";
import React from "react";
import { useRouter } from "next/router";
import { Info, RotateCcw } from "lucide-react";
import InstallButton from "@/components/settings/InstallButton";
import { SkeletonSettings } from "@/components/ui/Skeleton";
import VersionInfo from "@/components/settings/Version";
import SettingsForm, { SETTINGS_SECTIONS } from "@/components/settings/SettingsForm";
import LocationSection from "@/components/settings/LocationSection";
import UserSection from "@/components/settings/UserSection";
import { useSettings } from "@/hooks/db/useSettings";
import PushNotificationManager from "@/components/settings/PushNotificationManager";
import LoveButton from "@/components/settings/LoveButton";
import ReportTemplatePanel from "@/components/reports/ReportTemplatePanel";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import type { Settings } from "@/types/settings";
import Seo from "@/components/ui/SEO";
import SlackListsSection from "@/components/settings/SlackListsSection";
import DataExportSection from "@/components/settings/DataExportSection";
import ShortcutTokenSection from "@/components/settings/ShortcutTokenSection";

const OTHER_SECTIONS = [
  { id: "powiadomienia", title: "Powiadomienia" },
  { id: "szablony", title: "Szablony protokołów" },
  { id: "integracje", title: "Integracje" },
  { id: "konto", title: "Konto" },
];

function Group({ id, title, children }: Readonly<{ id: string; title: string; children: React.ReactNode }>) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mb-6 max-w-3xl scroll-mt-20">
      <h2 id={`${id}-h`} className="mb-3 text-lg font-bold text-text">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { settings, loading, fetching, locationStatus, updateSettings, requestGeolocation, handleSignOut } =
    useSettings();

  const savePartial = async (patch: Partial<Settings>) => {
    const { error } = await updateSettings(patch);
    return !error;
  };

  const handleRestoreDefaults = async () => {
    const ok = await toast.confirm(
      "Przywrócić domyślne ustawienia we wszystkich sekcjach? Zmiany zostaną od razu zapisane."
    );
    if (!ok) return;
    const { error } = await updateSettings(DEFAULT_SETTINGS);
    if (!error) toast.success("Przywrócono domyślne ustawienia!");
  };

  return (
    <>
      <Seo
        title="Ustawienia"
        description="Dostosuj działanie aplikacji Dzisiaj.Fun: preferencje, powiadomienia, integrację ze Slackiem i Skrótami Siri oraz eksport danych."
        canonical="https://dzisiaj.fun/settings"
        keywords="ustawienia, konfiguracja, personalizacja, profil, motyw"
        noindex={true}
      />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="page-title">
          Menu&nbsp;&nbsp;
          <LoveButton />
        </h1>
        <InstallButton />
      </div>

      {/* Tylko pierwsze wczytanie – przy zapisie sekcje zostają (inaczej zniknęłyby niezapisane zmiany). */}
      {fetching ? (
        <SkeletonSettings />
      ) : (
        <>
          {/* Spis sekcji – skok do wybranej części ustawień */}
          <nav aria-label="Sekcje ustawień" className="-mx-3 mb-6 sm:mx-0">
            <ul className="flex gap-2 overflow-x-auto px-3 pb-1 sm:flex-wrap sm:px-0">
              {[...SETTINGS_SECTIONS, ...OTHER_SECTIONS].map((s) => (
                <li key={s.id} className="shrink-0">
                  <a
                    href={`#${s.id}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-sm font-medium text-text-secondary hover:text-text"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <SettingsForm settings={settings} defaults={DEFAULT_SETTINGS} onSavePartial={savePartial} />

          <Group id="powiadomienia" title="Powiadomienia">
            <PushNotificationManager userId={user?.id} />
          </Group>

          <Group id="szablony" title="Szablony protokołów">
            <ReportTemplatePanel />
          </Group>

          <Group id="integracje" title="Integracje">
            <LocationSection onRequestLocation={requestGeolocation} locationStatus={locationStatus} />
            <SlackListsSection />
            <ShortcutTokenSection />
          </Group>

          <Group id="konto" title="Konto">
            <UserSection email={user?.email} onSignOut={handleSignOut} />
            <DataExportSection />
            <div className="mb-6 flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void handleRestoreDefaults()}
                disabled={loading}
                className="flex min-h-11 items-center gap-2 px-2 text-sm font-medium text-text-secondary hover:underline disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Przywróć wszystkie ustawienia domyślne
              </button>
              <button
                type="button"
                onClick={() => void router.push("/guide")}
                className="flex min-h-11 items-center gap-2 rounded-lg border border-line-strong px-4 text-sm font-medium text-text-secondary hover:text-text"
              >
                Instrukcja <Info className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </Group>

          <VersionInfo />
        </>
      )}
    </>
  );
}
