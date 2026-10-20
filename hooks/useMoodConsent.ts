// hooks/useMoodConsent.ts
//
// Wyraźna zgoda na zapis nastroju (art. 9 ust. 2 lit. a RODO – nastrój może
// ujawniać informacje o zdrowiu). Data zgody jest w settings.mood_consent_at;
// dopóki baza nie ma tej kolumny (skrypt supabase/sql/…), zgoda jest
// pamiętana w przeglądarce, żeby moduł działał bez przerwy.

import { MOOD_CONSENT_VERSION, MOOD_CONSENT_LEGACY_VERSION } from "@/config/defaults";
import { useCallback, useSyncExternalStore } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useSettings } from "@/hooks/db/useSettings";
import { USER_LOCAL_STORAGE_KEYS } from "@/config/storage";

const listeners = new Set<() => void>();

function readLocalConsent(): string | null {
  try {
    return localStorage.getItem(USER_LOCAL_STORAGE_KEYS.moodConsent);
  } catch {
    return null;
  }
}

function writeLocalConsent(value: string | null) {
  try {
    if (value) localStorage.setItem(USER_LOCAL_STORAGE_KEYS.moodConsent, value);
    else localStorage.removeItem(USER_LOCAL_STORAGE_KEYS.moodConsent);
  } catch {
    // Tryb prywatny – zgoda zostaje tylko w bazie.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type MoodConsentStatus = "loading" | "granted" | "missing";

export function useMoodConsent() {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  const { settings, fetching, updateSettings } = useSettings();
  const localConsent = useSyncExternalStore(subscribe, readLocalConsent, () => null);
  const consentAt = settings.mood_consent_at ?? localConsent;
  const consentVersion = settings.mood_consent_at
    ? (settings.mood_consent_version ?? MOOD_CONSENT_LEGACY_VERSION)
    : MOOD_CONSENT_LEGACY_VERSION;
  const hasConsent = Boolean(consentAt) && consentVersion === MOOD_CONSENT_VERSION;
  // Dopóki ustawienia się wczytują, nie wiemy, czy zgoda jest – nie pokazujemy prośby
  // (kliknięcie nadpisałoby datę pierwotnej zgody).
  let status: MoodConsentStatus = "missing";
  if (fetching) status = "loading";
  else if (hasConsent) status = "granted";

  const grant = useCallback(async () => {
    // Zgoda na bieżącą wersję treści już jest – nie nadpisujemy daty.
    if (hasConsent || fetching) return;
    const now = new Date().toISOString();
    writeLocalConsent(now);
    await updateSettings({ mood_consent_at: now, mood_consent_version: MOOD_CONSENT_VERSION });
  }, [hasConsent, fetching, updateSettings]);

  /** Cofnięcie zgody usuwa wszystkie wpisy nastroju (koniec przetwarzania). */
  const revoke = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    const confirmed = await toast.confirm("Cofnąć zgodę? Wszystkie zapisane nastroje zostaną trwale usunięte.", {
      confirmLabel: "Cofnij zgodę i usuń",
    });
    if (!confirmed) return false;
    const { error } = await supabase.from("mood_entries").delete().eq("user_id", user.id);
    if (error) {
      toast.error("Nie udało się usunąć wpisów nastroju. Zgoda nie została cofnięta.");
      return false;
    }
    writeLocalConsent(null);
    await updateSettings({ mood_consent_at: null, mood_consent_version: null });
    return true;
  }, [user, supabase, toast, updateSettings]);

  return { status, hasConsent, consentAt, consentVersion: hasConsent ? MOOD_CONSENT_VERSION : null, grant, revoke };
}
