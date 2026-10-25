// providers/SettingsProvider.tsx
//
// Ustawienia użytkownika – jedno źródło dla całej aplikacji. Wiersz `settings`
// pobieramy raz po zalogowaniu; wszystkie komponenty (pasek, formularze,
// kategorie zadań, wyłączone moduły) czytają ten sam stan, więc zapis
// w jednym miejscu jest od razu widoczny wszędzie.

import { useLatestRef } from "@/hooks/useLatestRef";
import { useQueryState } from "@/hooks/useQueryState";
import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";
import { isAbortError } from "@/lib/abortUtils";
import { requestSmartLocation } from "@/lib/locationUtils";
import { settingsFromRow } from "@/lib/settings";
import { DEFAULT_SETTINGS } from "@/config/defaults";
import { MAX_FAVORITE_STOPS } from "@/config/limits";
import { favoriteKey, isSameStopPlace, type FavoriteStop } from "@/shared/stopGrouping";
import type { Settings } from "@/types/settings";

type SaveResult = { error: unknown };

export interface SettingsContextValue {
  settings: Settings;
  fetching: boolean;
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
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  // Wiersz settings z bazy przez TanStack Query (jedno zapytanie na sesję, wspólna pamięć).
  const querySettings = useCallback(
    async ({ signal }: { signal: AbortSignal }): Promise<Settings> => {
      try {
        const { data, error } = await withRetry(
          () =>
            supabase
              .from("settings")
              .select("*")
              .eq("user_id", userId as string)
              .abortSignal(signal)
              .maybeSingle(),
          signal
        );
        if (error) throw error;
        return data ? settingsFromRow(data) : DEFAULT_SETTINGS;
      } catch (err) {
        if (!isAbortError(err)) toast.error("Nie udało się pobrać ustawień.", { cause: err });
        throw err;
      }
    },
    [supabase, userId, toast, withRetry]
  );
  const {
    data: settings,
    setData: setSettings,
    fetching: fetchingSettings,
  } = useQueryState<Settings>({
    queryKey: ["settings", userId ?? null],
    queryFn: querySettings,
    initial: DEFAULT_SETTINGS,
    enabled: !loadingUser && Boolean(userId),
  });
  const fetching = loadingUser || fetchingSettings;
  const settingsRef = useLatestRef(settings);

  const applySettings = useCallback(
    (next: Settings) => {
      settingsRef.current = next;
      setSettings(next);
    },
    [settingsRef, setSettings]
  );

  const upsertSettings = useCallback(
    (row: Record<string, unknown>) => supabase.from("settings").upsert(row, { onConflict: "user_id" }),
    [supabase]
  );

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
        toast.error("Nie udało się zapisać ustawień.", { cause: error });
        return { error };
      } finally {
        setLoading(false);
      }
    },
    [userId, toast, withRetry, upsertSettings, applySettings, settingsRef]
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
    [applySettings, settingsRef]
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
    [toast, saveFavoriteStops, setFavoriteStops, settingsRef]
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
    [toast, saveFavoriteStops, setFavoriteStops, settingsRef]
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
    [userId, saveFavoriteStops, setFavoriteStops, settingsRef]
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
