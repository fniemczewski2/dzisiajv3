// hooks/useHealthConsent.ts
//
// Zgoda na dane o zdrowiu ze Skrótów iOS (art. 9 ust. 2 lit. a RODO). Cofnięcie zgody usuwa zapisane dane
// (art. 7 ust. 3 RODO: cofnięcie musi być równie łatwe jak udzielenie).

import { useCallback } from "react";
import { HEALTH_CONSENT_VERSION } from "@/config/defaults";
import { useSettings } from "@/hooks/db/useSettings";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

/** Wszystkie tabele z danymi o zdrowiu – cofnięcie zgody usuwa je wszystkie. */
const HEALTH_TABLES = ["health_workouts", "health_daily", "health_sleep_segments", "health_heart_rate"] as const;

export function useHealthConsent() {
  const { user, supabase } = useAuth();
  const { toast } = useToast();
  const { settings, updateSettings } = useSettings();
  const consentAt = settings?.health_consent_at ?? null;
  const hasConsent = Boolean(consentAt) && settings?.health_consent_version === HEALTH_CONSENT_VERSION;

  const grant = useCallback(async () => {
    await updateSettings({
      health_consent_at: new Date().toISOString(),
      health_consent_version: HEALTH_CONSENT_VERSION,
    });
  }, [updateSettings]);

  const revoke = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    for (const table of HEALTH_TABLES) {
      const { error } = await supabase.from(table).delete().eq("user_id", user.id);
      if (error) {
        toast.error("Nie udało się usunąć danych o zdrowiu. Zgoda nie została cofnięta.", { cause: error });
        return false;
      }
    }
    await updateSettings({ health_consent_at: null, health_consent_version: null });
    return true;
  }, [user, supabase, toast, updateSettings]);

  return { hasConsent, consentAt, consentVersion: hasConsent ? HEALTH_CONSENT_VERSION : null, grant, revoke };
}
