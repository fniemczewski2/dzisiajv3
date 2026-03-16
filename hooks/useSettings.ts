// hooks/useSettings.ts

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../providers/AuthProvider";
import { Settings } from "../types";
import { DEFAULT_MOODS } from "../components/widgets/MoodTracker";

type GeoCoords = { lat: number; lng: number };

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

export function useSettings() {
  const { user, supabase } = useAuth();
  const userId = user?.id;

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
  };

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const loadSettings = async () => {
      setLoading(true);
      const columns = [
        "sort_order","show_completed","show_habits","show_water_tracker",
        "show_budget_items","show_notifications","users","favorite_stops",
        "notif_morning_brief","notif_tasks","notif_events","notif_water",
        "notif_habits","notif_evening","sort_notes","sort_shopping",
        "sort_movies","sort_recipes","sort_places","habit_pills","habit_bath",
        "habit_workout","habit_friends","habit_work","habit_housework",
        "habit_plants","habit_duolingo","show_mood_tracker","mood_options",
      ].join(",");

      const { data, error } = await supabase
        .from("settings")
        .select(columns)
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data) {
        setSettings({
          sort_order: data.sort_order ?? "priority",
          show_completed: data.show_completed ?? true,
          show_habits: data.show_habits ?? true,
          show_water_tracker: data.show_water_tracker ?? true,
          show_budget_items: data.show_budget_items ?? true,
          show_mood_tracker: data.show_mood_tracker ?? true,
          show_notifications: data.show_notifications ?? true,
          users: safeParseArray(data.users),
          favorite_stops: safeParseArray(data.favorite_stops),
          notif_morning_brief: data.notif_morning_brief ?? true,
          notif_tasks: data.notif_tasks ?? true,
          notif_events: data.notif_events ?? true,
          notif_water: data.notif_water ?? true,
          notif_habits: data.notif_habits ?? true,
          notif_evening: data.notif_evening ?? true,
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
          mood_options: data.mood_options ?? DEFAULT_MOODS,
        });
      }
      setLoading(false);
    };

    loadSettings();
  }, [supabase, userId]);

  /**
   * Persists current settings. Returns { error }.
   * Caller should toast.success / toast.error based on result.
   */
  const saveSettings = useCallback(async () => {
    if (!userId) return { error: "No user" };
    setSaving(true);
    const { error } = await supabase
      .from("settings")
      .upsert({ user_id: userId, ...settings }, { onConflict: "user_id" });
    setSaving(false);
    return { error };
  }, [supabase, settings, userId]);

  /**
   * Merges partial settings and persists. Returns { error }.
   * Caller should toast on failure.
   */
  const updateSettings = useCallback(async (partialSettings: Partial<Settings>) => {
    if (!userId) return { error: "No user" };
    setSaving(true);
    const updated = { ...settings, ...partialSettings };
    setSettings(updated);
    const { error } = await supabase
      .from("settings")
      .upsert({ user_id: userId, ...updated }, { onConflict: "user_id" });
    setSaving(false);
    if (error) throw error;
    return { error };
  }, [supabase, settings, userId]);

  /**
   * Returns false when limit reached — caller toasts.
   * Throws on Supabase error.
   */
  const addFavoriteStop = async (name: string, zone_id = "AUTO"): Promise<boolean> => {
    if (settings.favorite_stops.some((s) => s.name === name)) return true;
    if (settings.favorite_stops.length >= 10) return false;
    const updated = [...settings.favorite_stops, { name, zone_id }];
    setSettings((prev) => ({ ...prev, favorite_stops: updated }));
    const { error } = await supabase
      .from("settings")
      .upsert({ user_id: userId, favorite_stops: updated }, { onConflict: "user_id" });
    if (error) throw error;
    return true;
  };

  /** Throws on Supabase error. */
  const removeFavoriteStop = async (name: string) => {
    const updated = settings.favorite_stops.filter((s) => s.name !== name);
    setSettings((prev) => ({ ...prev, favorite_stops: updated }));
    const { error } = await supabase
      .from("settings")
      .upsert({ user_id: userId, favorite_stops: updated }, { onConflict: "user_id" });
    if (error) throw error;
  };

  const addUser = () => {
    if (settings.users.length < 10)
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

  const requestGeolocation = (onSuccess?: (coords: GeoCoords) => void) => {
    if (!navigator.geolocation) {
      setLocationStatus("Geolokalizacja nie jest obsługiwana.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        setLocationStatus(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        onSuccess?.({ lat: latitude, lng: longitude });
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED   ? "Odmowa dostępu do lokalizacji."
          : err.code === err.POSITION_UNAVAILABLE ? "Lokalizacja niedostępna."
          : err.code === err.TIMEOUT            ? "Przekroczono czas oczekiwania."
          : "Nieznany błąd lokalizacji.";
        setLocationStatus(msg);
      }
    );
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    settings,
    setSettings,
    DEFAULT_SETTINGS,
    loading,
    saving,
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