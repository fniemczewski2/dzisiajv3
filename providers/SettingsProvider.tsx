// providers/SettingsProvider.tsx
//
// Ustawienia użytkownika – jedno źródło dla całej aplikacji. Wiersz `settings`
// pobieramy raz po zalogowaniu; wszystkie komponenty (pasek, formularze,
// kategorie zadań, wyłączone moduły) czytają ten sam stan, więc zapis
// w jednym miejscu jest od razu widoczny wszędzie.

import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";
import { useAbortController } from "@/hooks/useAbortController";
import { isAbortError } from "@/lib/abortUtils";
import { omit } from "@/lib/objectUtils";
import { requestSmartLocation } from "@/lib/locationUtils";
import { settingsFromRow } from "@/lib/settings";
import { DEFAULT_SETTINGS } from "@/config/defaults";
import { MAX_FAVORITE_STOPS } from "@/config/limits";
import { favoriteKey, isSameStopPlace, type FavoriteStop } from "@/shared/stopGrouping";
import type { Settings } from "@/types/settings";

/** Kolumny dodane migracjami – zapis ustawień działa także bez nich. */
const OPTIONAL_SETTINGS_COLUMNS = [
  "task_categories",
  "category_colors",
  "disabled_modules",
  "custom_habits",
  "rss_sources",
  "rss_custom",
  "report_template",
  "daily_spending_categories",
  "notif_bills",
] as const;

type SaveResult = { error: unknown };

export interface SettingsContextValue {
  settings: Settings;
  /** Pierwsze wczytanie z bazy (skeleton). */
  fetching: boolean;
  /** Trwa zapis. */
  loading: boolean;
  locationStatus: string | null;
  updateSettings: (partial: Partial<Settings>) => Promise<SaveResult>;
  addFavoriteStop: (stop: FavoriteStop) => Promise<boolean>;
  removeFavoriteStop: (key: string) => Promise<void>;
  upgradeFavoriteStops: (upgrades: Map<string, FavoriteStop>) => Promise<void>;
  requestGeolocation: (onSuccess?: (coords: { lat: number; lng: number }) => void) => void;
  handleSignOut: () => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

const GEOLOCATION_ERRORS: Record<number, string> = {
  1: "Odmowa dostępu. Zezwól na lokalizację w ustawieniach przeglądarki.",
  2: "Lokalizacja niedostępna.",
  3: "Przekroczono czas oczekiwania na lokalizację.",
};

export function SettingsProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { user, loadingUser, supabase } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const { toast } = useToast();
  const withRetry = useRetry();
  const { getSignal } = useAbortController();

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const settingsRef = useRef(settings);

  const applySettings = useCallback((next: Settings) => {
    settingsRef.current = next;
    setSettings(next);
  }, []);

  // Zapis odporny na brak nowszych kolumn (kod wdrożony przed migracją bazy):
  // brakującą kolumnę pomijamy i próbujemy ponownie. Próby są z natury
  // sekwencyjne (każda zależy od błędu poprzedniej), stąd rekurencja z limitem.
  const upsertSettings = useCallback(
    async (row: Record<string, unknown>) => {
      const attempt = async (current: Record<string, unknown>, remaining: number) => {
        const result = await supabase.from("settings").upsert(current, { onConflict: "user_id" });
        const message = result.error?.code === "PGRST204" ? result.error.message : "";
        const missing = OPTIONAL_SETTINGS_COLUMNS.find((c) => message.includes(`'${c}'`) && c in current);
        if (!missing || remaining === 0) return result;
        return attempt(omit(current, [missing]), remaining - 1);
      };
      return attempt(row, OPTIONAL_SETTINGS_COLUMNS.length);
    },
    [supabase]
  );

  useEffect(() => {
    if (loadingUser) return;
    if (!userId) {
      applySettings(DEFAULT_SETTINGS);
      setFetching(false);
      return;
    }
    let cancelled = false;
    const signal = getSignal();
    setFetching(true);

    const load = async () => {
      try {
        const { data, error } = await withRetry(
          () => supabase.from("settings").select("*").eq("user_id", userId).abortSignal(signal).maybeSingle(),
          signal
        );
        if (cancelled) return;
        if (error) throw error;
        applySettings(data ? settingsFromRow(data) : DEFAULT_SETTINGS);
      } catch (err) {
        if (isAbortError(err) || cancelled) return;
        toast.error("Nie udało się pobrać ustawień.");
      } finally {
        if (!cancelled) setFetching(false);
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [loadingUser, userId, supabase, toast, withRetry, getSignal, applySettings]);

  const updateSettings = useCallback(
    async (partial: Partial<Settings>): Promise<SaveResult> => {
      if (!userId) return { error: new Error("Brak zalogowanego użytkownika.") };
      setLoading(true);
      const previous = settingsRef.current;
      const updated = { ...previous, ...partial };
      applySettings(updated);

      try {
        // Zapisujemy tylko zmienione pola – inne karty przeglądarki nie zostaną
        // nadpisane. Gdy wiersza jeszcze nie ma (wymagane kolumny), pełny zapis.
        let { error } = await withRetry(() => upsertSettings({ user_id: userId, ...partial }));
        if (error?.code === "23502") {
          ({ error } = await withRetry(() => upsertSettings({ user_id: userId, ...updated })));
        }
        if (error) throw error;
        toast.success("Zapisano ustawienia.");
        return { error: null };
      } catch (error) {
        applySettings(previous);
        toast.error("Nie udało się zapisać ustawień.");
        return { error };
      } finally {
        setLoading(false);
      }
    },
    [userId, toast, withRetry, upsertSettings, applySettings]
  );

  const saveFavoriteStops = useCallback(
    async (updated: FavoriteStop[]) => {
      if (!userId) throw new Error("Brak zalogowanego użytkownika.");
      const { error } = await withRetry(() =>
        supabase.from("settings").upsert({ user_id: userId, favorite_stops: updated }, { onConflict: "user_id" })
      );
      if (error) throw error;
    },
    [userId, supabase, withRetry]
  );

  const setFavoriteStops = useCallback(
    (stops: FavoriteStop[]) => applySettings({ ...settingsRef.current, favorite_stops: stops }),
    [applySettings]
  );

  const addFavoriteStop = useCallback(
    async (stop: FavoriteStop): Promise<boolean> => {
      const previous = settingsRef.current.favorite_stops;
      if (previous.some((s) => isSameStopPlace(s, stop))) {
        toast.info("Ten przystanek jest już w ulubionych.");
        return true;
      }
      if (previous.length >= MAX_FAVORITE_STOPS) {
        toast.error(`Osiągnięto limit ${MAX_FAVORITE_STOPS} ulubionych przystanków.`);
        return false;
      }
      setFavoriteStops([...previous, stop]);
      try {
        await saveFavoriteStops([...previous, stop]);
        const locality = stop.locality ? ` (${stop.locality})` : "";
        toast.success(`Dodano do ulubionych: ${stop.name}${locality}.`);
        return true;
      } catch {
        setFavoriteStops(previous);
        toast.error("Nie udało się dodać przystanku.");
        return false;
      }
    },
    [toast, saveFavoriteStops, setFavoriteStops]
  );

  /** Usuwa po kluczu favoriteKey() – nie po nazwie, żeby nie zabrać przystanku z innej miejscowości. */
  const removeFavoriteStop = useCallback(
    async (key: string) => {
      const previous = settingsRef.current.favorite_stops;
      const updated = previous.filter((s) => favoriteKey(s) !== key);
      if (updated.length === previous.length) return;
      setFavoriteStops(updated);
      try {
        await saveFavoriteStops(updated);
        toast.success("Usunięto przystanek z ulubionych.");
      } catch {
        setFavoriteStops(previous);
        toast.error("Nie udało się usunąć przystanku.");
      }
    },
    [toast, saveFavoriteStops, setFavoriteStops]
  );

  /**
   * Ciche uzupełnienie starych wpisów (sama nazwa) o położenie grupy, którą
   * serwer do nich dopasował – od tej chwili są jednoznaczne.
   */
  const upgradeFavoriteStops = useCallback(
    async (upgrades: Map<string, FavoriteStop>) => {
      if (!userId || upgrades.size === 0) return;
      const previous = settingsRef.current.favorite_stops;
      let changed = false;
      const updated = previous.map((s) => {
        const next = upgrades.get(favoriteKey(s));
        if (!next || s.lat !== undefined) return s;
        changed = true;
        return { ...next, name: s.name, ...(s.locality ? { locality: s.locality } : {}) };
      });
      if (!changed) return;
      setFavoriteStops(updated);
      try {
        await saveFavoriteStops(updated);
      } catch {
        setFavoriteStops(previous);
      }
    },
    [userId, saveFavoriteStops, setFavoriteStops]
  );

  const requestGeolocation = useCallback(
    (onSuccess?: (coords: { lat: number; lng: number }) => void) => {
      requestSmartLocation({
        forcePrompt: true,
        onSuccess: (position) => {
          const { latitude, longitude } = position.coords;
          setLocationStatus(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          onSuccess?.({ lat: latitude, lng: longitude });
        },
        onError: (err) => {
          const message = GEOLOCATION_ERRORS[err.code] ?? "Nie udało się ustalić lokalizacji.";
          setLocationStatus(message);
          toast.error(message);
        },
      });
    },
    [toast]
  );

  const handleSignOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch {
      toast.error("Nie udało się wylogować.");
    } finally {
      await router.replace("/start");
    }
  }, [supabase, toast, router]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      fetching,
      loading,
      locationStatus,
      updateSettings,
      addFavoriteStop,
      removeFavoriteStop,
      upgradeFavoriteStops,
      requestGeolocation,
      handleSignOut,
    }),
    [
      settings,
      fetching,
      loading,
      locationStatus,
      updateSettings,
      addFavoriteStop,
      removeFavoriteStop,
      upgradeFavoriteStops,
      requestGeolocation,
      handleSignOut,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
