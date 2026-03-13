import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../providers/AuthProvider";
import { Settings } from "../types";
import { DEFAULT_MOODS } from "../components/widgets/MoodTracker";

type GeoCoords = { lat: number; lng: number };

const safeParseArray = (data: any) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Błąd parsowania tablicy:", e);
      return [];
    }
  }
  return [];
};

export function useSettings() {
  const { user, supabase } = useAuth();
  const userId = user?.id;

  // 1. STATYCZNE WARTOŚCI DOMYŚLNE (przed załadowaniem z bazy)
  const [settings, setSettings] = useState<Settings>({
    sort_order: "priority",
    show_completed: true,
    show_habits: true,
    show_water_tracker: true,
    show_budget_items: true,
    show_notifications: true,
    show_mood_tracker: true,
    users: [],
    favorite_stops: [],
    
    // Powiadomienia
    notif_morning_brief: true,
    notif_tasks: true,
    notif_events: true,
    notif_water: true,
    notif_habits: true,
    notif_evening: true,

    // Sortowanie
    sort_notes: "updated_desc",
    sort_shopping: "updated_desc",
    sort_movies: "rating",
    sort_recipes: "category",
    sort_places: "alphabetical",

    // Poszczególne nawyki
    habit_pills: true,
    habit_bath: true,
    habit_workout: true,
    habit_friends: true,
    habit_work: true,
    habit_housework: true,
    habit_plants: true,
    habit_duolingo: true,
    mood_options: DEFAULT_MOODS,
  });

  const DEFAULT_SETTINGS = {
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadSettings = async () => {
      setLoading(true);
      
      // Lista wszystkich kolumn do pobrania z bazy
      const columns = [
        "sort_order", "show_completed", "show_habits", "show_water_tracker", "show_budget_items", "show_notifications", "users", "favorite_stops",
        "notif_morning_brief", "notif_tasks", "notif_events", "notif_water", "notif_habits", "notif_evening",
        "sort_notes", "sort_shopping", "sort_movies", "sort_recipes", "sort_places",
        "habit_pills", "habit_bath", "habit_workout", "habit_friends", "habit_work", "habit_housework", "habit_plants", "habit_duolingo"
      ].join(",");

      const { data, error } = await supabase
        .from("settings")
        .select(columns)
        .eq("user_id", userId)
        .maybeSingle();
        
      if (!error && data) {
        // 2. NADPISYWANIE DANYMI Z BAZY LUB FALLBACK DO DOMYŚLNYCH
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
          mood_options: data.mood_options ?? [],
        });
      }
      setLoading(false);
    };

    loadSettings();
  }, [supabase, userId]);

  const saveSettings = useCallback(async () => {
    if (!userId) return { error: "No user" };

    setSaving(true);
    const payload = { user_id: userId, ...settings };
    const { error } = await supabase.from("settings").upsert(payload, { onConflict: "user_id" });
    setSaving(false);

    return { error };
  }, [supabase, settings, userId]);
  
  const updateSettings = useCallback(async (partialSettings: Partial<Settings>) => {
    if (!userId) return { error: "No user" };

    setSaving(true);
    const updatedSettings = { ...settings, ...partialSettings };
    setSettings(updatedSettings);

    const payload = { user_id: userId, ...updatedSettings };
    const { error } = await supabase.from("settings").upsert(payload, { onConflict: "user_id" });
    setSaving(false);

    if (error) {
       console.error("Błąd zapisywania partial settings:", error);
    }

    return { error };
  }, [supabase, settings, userId]);

  const addFavoriteStop = async (name: string, zone_id: string = "AUTO") => {
    if (settings.favorite_stops.some(s => s.name === name)) return;

    if (settings.favorite_stops.length >= 10) {
      alert("Możesz dodać maksymalnie 10 przystanków.");
      return;
    }

    const updated = [...settings.favorite_stops, { name, zone_id }];
    setSettings(prev => ({ ...prev, favorite_stops: updated }));

    await supabase.from("settings").upsert({
      user_id: userId,
      favorite_stops: updated,
    }, { onConflict: "user_id" });
  };

  const removeFavoriteStop = async (name: string) => {
    const updated = settings.favorite_stops.filter(s => s.name !== name);
    setSettings(prev => ({ ...prev, favorite_stops: updated }));

    await supabase.from("settings").upsert({
      user_id: userId,
      favorite_stops: updated,
    }, { onConflict: "user_id" });
  };

  const addUser = () => {
    if (settings.users.length < 10) {
      setSettings((s) => ({ ...s, users: [...s.users, ""] }));
    }
  };

  const removeUser = (idx: number) => {
    setSettings((s) => ({ ...s, users: s.users.filter((_, i) => i !== idx) }));
  };

  const updateUser = (idx: number, value: string) => {
    setSettings((s) => {
      const updated = [...s.users];
      updated[idx] = value;
      return { ...s, users: updated };
    });
  };

  const requestGeolocation = (onSuccess?: (coords: GeoCoords) => void) => {
    if (!navigator.geolocation) {
      setLocationStatus("Geolokalizacja nie jest obsługiwana.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocationStatus(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        if (typeof onSuccess === 'function') {
          onSuccess({ lat: latitude, lng: longitude });
        }
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED: setLocationStatus("Odmowa dostępu do lokalizacji."); break;
          case error.POSITION_UNAVAILABLE: setLocationStatus("Lokalizacja niedostępna."); break;
          case error.TIMEOUT: setLocationStatus("Przekroczono czas oczekiwania."); break;
          default: setLocationStatus("Nieznany błąd lokalizacji.");
        }
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