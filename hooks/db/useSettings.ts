// hooks/useSettings.ts

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { Settings } from "@/types/settings";
import { DEFAULT_MOODS } from "@/components/widgets/MoodTracker";
import { MAX_FAVORITE_STOPS, MAX_TRUSTED_USERS } from "@/config/limits";
import { requestSmartLocation } from "@/lib/locationUtils";
import { useToast } from "@/providers/ToastProvider";

const safeParseArray = (data: unknown): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      console.warn("[useSettings] safeParseArray: failed to parse", data);
      return [];
    }
  }
  return [];
};

const normalizeFavoriteStops = (data: unknown) => {
  const parsed = safeParseArray(data);
  return parsed.map((item: any) => {
    if (typeof item === 'string') return { name: item, zone_id: 'AUTO' };
    return { name: item?.name || '', zone_id: item?.zone_id || 'AUTO' };
  }).filter((item: any) => item.name !== '');
};

const DEFAULT_SETTINGS: Settings = {
  sort_order: "priority",
  show_completed: true,
  show_habits: true,
  show_water_tracker: true,
  show_budget_items: true,
  show_mood_tracker: true,
  show_notifications: true,
  users: [],
  favorite_stops: [],
  notif_morning_brief: true,
  notif_tasks: true,
  notif_events: true,
  notif_water: true,
  notif_habits: true,
  notif_evening: true,
  notif_birthdays: true, 
  notif_contact:  true,
  sort_notes: "updated_desc",
  sort_shopping: "updated_desc",
  sort_movies: "rating",
  sort_recipes: "category",
  sort_places: "alphabetical",
  habit_pills: true,
  habit_bath: true,
  habit_workout: true,
  habit_friends: true,
  habit_work: true,
  habit_housework: true,
  habit_plants: true,
  habit_duolingo: true,
  mood_options: DEFAULT_MOODS,
  main_view: "calendar",
  sort_people: "alphabetical",
  hide_priority_5: false
};

export function useSettings() {
  const { user, loadingUser, supabase } = useAuth();
  const userId = user?.id;

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  const settingsRef = useRef(settings);

  const { toast } = useToast();
  useEffect(() => {
    let toastId: string | undefined;
    if (fetching  && toast.loading) toastId = toast.loading("Ładowanie ustawień...");
    return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [fetching, toast]);

  useEffect(() => { settingsRef.current = settings; }, [settings]);

  useEffect(() => {
    if (loadingUser) return;
    let cancelled = false;

    const loadSettings = async () => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setFetching(true);
      try {
        const { data, error } = await supabase
          .from("settings")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("[useSettings] Fetch error:", error.message);
          setFetching(false);
          return;
        }

        if (data) {
          setSettings({
            sort_order: data.sort_order ?? "priority",
            show_completed: data.show_completed ?? true,
            show_habits: data.show_habits ?? true,
            show_water_tracker: data.show_water_tracker ?? true,
            show_budget_items: data.show_budget_items ?? true,
            show_mood_tracker: data.show_mood_tracker ?? true,
            show_notifications: data.show_notifications ?? true,
            users: safeParseArray(data.users),
            favorite_stops: normalizeFavoriteStops(data.favorite_stops),
            notif_morning_brief: data.notif_morning_brief ?? true,
            notif_tasks: data.notif_tasks ?? true,
            notif_events: data.notif_events ?? true,
            notif_water: data.notif_water ?? true,
            notif_habits: data.notif_habits ?? true,
            notif_evening: data.notif_evening ?? true,
            notif_birthdays: data.notif_birthdays ?? true, 
            notif_contact: data.notif_contact ?? true,
            sort_notes: data.sort_notes ?? "updated_desc",
            sort_shopping: data.sort_shopping ?? "updated_desc",
            sort_movies: data.sort_movies ?? "updated_desc",
            sort_recipes: data.sort_recipes ?? "category",
            sort_places: data.sort_places ?? "alphabetical",
            habit_pills: data.habit_pills ?? true,
            habit_bath: data.habit_bath ?? true,
            habit_workout: data.habit_workout ?? true,
            habit_friends: data.habit_friends ?? true,
            habit_work: data.habit_work ?? true,
            habit_housework: data.habit_housework ?? true,
            habit_plants: data.habit_plants ?? true,
            habit_duolingo: data.habit_duolingo ?? true,
            mood_options: data.mood_options ? safeParseArray(data.mood_options) : DEFAULT_MOODS,
            main_view: data.main_view ?? "calendar",
            sort_people: data.sort_people ?? "alphabetical",
            hide_priority_5: data.hide_priority_5 ?? false
          });
        }
      } catch {
        console.error("Wystąpił błąd ustawień.")
      } finally {
        if (!cancelled) setFetching(false);
      }
    };

    loadSettings();

    return () => { cancelled = true; };
  }, [loadingUser, userId, supabase, toast]);

  const saveSettings = useCallback(async () => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setLoading(true);
    
    const { error } = await supabase
      .from("settings")
      .upsert({ user_id: userId, ...settingsRef.current }, { onConflict: "user_id" });
      
    setLoading(false);
    return { error };
  }, [supabase, userId, toast]);

  const updateSettings = useCallback(async (partialSettings: Partial<Settings>) => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setLoading(true);

    const updated = { ...settingsRef.current, ...partialSettings };
    setSettings(updated);
    globalThis.dispatchEvent(new CustomEvent('settingsUpdated', { detail: updated }));
    
    const { error } = await supabase
      .from("settings")
      .upsert({ user_id: userId, ...updated }, { onConflict: "user_id" });

    setLoading(false);
    if (error) throw error;
    return { error };
  }, [supabase, userId, toast]);

  const addFavoriteStop = async (name: string, zone_id = "AUTO"): Promise<boolean> => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    const stops = settingsRef.current.favorite_stops;
    if (stops.some((s: any) => (s.name || s) === name)) return true;
    if (stops.length >= MAX_FAVORITE_STOPS) return false;

    const updated = [...stops, { name, zone_id }];
    setSettings((prev) => ({ ...prev, favorite_stops: updated }));

    const { error } = await supabase
      .from("settings")
      .upsert({
        user_id: userId,
        favorite_stops: JSON.stringify(updated)
      }, { onConflict: "user_id" });

    if (error) throw error;
    return true;
  };

  const removeFavoriteStop = async (name: string) => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    const updated = settingsRef.current.favorite_stops.filter(
      (s: any) => (s.name || s) !== name
    );
    setSettings((prev) => ({ ...prev, favorite_stops: updated }));

    const { error } = await supabase
      .from("settings")
      .upsert({
        user_id: userId,
        favorite_stops: JSON.stringify(updated)
      }, { onConflict: "user_id" });

    if (error) throw error;
  };

  const addUser = () => {
    if (settings.users.length < MAX_TRUSTED_USERS)
      setSettings((s) => ({ ...s, users: [...s.users, ""] }));
  };

  const removeUser = (idx: number) =>
    setSettings((s) => ({ ...s, users: s.users.filter((_, i) => i !== idx) }));

  const updateUser = (idx: number, value: string) =>
    setSettings((s) => {
      const updated = [...s.users];
      updated[idx] = value;
      return { ...s, users: updated };
    });

  const requestGeolocation = (onSuccess?: (coords: {lat: number, lng: number}) => void) => {
    requestSmartLocation({
      forcePrompt: true, 
      onSuccess: (position) => {
        const { latitude, longitude } = position.coords;
        setLocationStatus(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        if (typeof onSuccess === 'function') {
          onSuccess({ lat: latitude, lng: longitude });
        }
      },
      onError: (err) => {
        const errorMessages: Record<number, string> = {
          1: "Odmowa dostępu. Zezwól na lokalizację.",
          2: "Lokalizacja niedostępna.",
          3: "Przekroczono czas oczekiwania.",
        };
        setLocationStatus(errorMessages[err.code] || "Nieznany błąd lokalizacji.");
      }
    });
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch {
      console.error("Wystąpił błąd wylogowywania.");
    } finally {
      globalThis.location.href = "/start";
    }
  };

  return {
    settings,
    setSettings,
    DEFAULT_SETTINGS,
    fetching,
    loading,
    locationStatus,
    saveSettings,
    updateSettings,
    addFavoriteStop,
    removeFavoriteStop,
    addUser,
    removeUser,
    updateUser,
    requestGeolocation,
    handleSignOut,
  };
}