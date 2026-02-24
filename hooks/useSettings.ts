import { useState, useEffect, useCallback } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

type SettingsType = {
  sort_order: string;
  show_completed: boolean;
  show_habits: boolean;
  show_water_tracker: boolean;
  show_budget_items: boolean;
  show_notifications: boolean;
  users: string[];
  favorite_stops:{ name: string; zone_id: string }[];
};

type GeoCoords = { lat: number; lng: number };

// Helper do bezpiecznego parsowania tablic z bazy danych
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
  const supabase = useSupabaseClient();
  const session = useSession();
  const userEmail = session?.user?.email || process.env.NEXT_PUBLIC_USER_EMAIL;

  const [settings, setSettings] = useState<SettingsType>({
    sort_order: "priority",
    show_completed: true,
    show_habits: true,
    show_water_tracker: true,
    show_budget_items: true,
    show_notifications: true,
    users: [],
    favorite_stops: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    const loadSettings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("settings")
        .select("sort_order,show_completed,show_habits,show_water_tracker,show_budget_items,show_notifications,users,favorite_stops")
        .eq("user_name", userEmail)
        .maybeSingle();
        
      if (!error && data) {
        setSettings({
          sort_order: data.sort_order ?? "priority",
          show_completed: data.show_completed ?? true,
          show_habits: data.show_habits ?? true,
          show_water_tracker: data.show_water_tracker ?? true,
          show_budget_items: data.show_budget_items ?? true,
          show_notifications: data.show_notifications ?? true,
          // Używamy helpera, żeby upewnić się, że zawsze mamy tablicę
          users: safeParseArray(data.users),
          favorite_stops: safeParseArray(data.favorite_stops),
        });
      }
      setLoading(false);
    };

    loadSettings();
  }, [session, supabase, userEmail]);

  const saveSettings = useCallback(async () => {
    if (!userEmail) return { error: "No user" };

    setSaving(true);
    const payload = { user_name: userEmail, ...settings };
    const { error } = await supabase.from("settings").upsert(payload, { onConflict: "user_name" });
    setSaving(false);

    return { error };
  }, [session, supabase, settings, userEmail]);


  // ------------------------
  // FAVORITE STOPS (ZMODYFIKOWANE)
  // ------------------------
  
  const addFavoriteStop = async (name: string, zone_id: string = "AUTO") => {
    if (settings.favorite_stops.some(s => s.name === name)) return;

    if (settings.favorite_stops.length >= 10) {
      alert("Możesz dodać maksymalnie 10 przystanków.");
      return;
    }

    const updated = [...settings.favorite_stops, { name, zone_id }];
    setSettings(prev => ({ ...prev, favorite_stops: updated }));

    await supabase.from("settings").upsert({
      user_name: userEmail,
      favorite_stops: updated,
    }, { onConflict: "user_name" });
  };

  const removeFavoriteStop = async (name: string) => {
    const updated = settings.favorite_stops.filter(s => s.name !== name);
    setSettings(prev => ({ ...prev, favorite_stops: updated }));

    await supabase.from("settings").upsert({
      user_name: userEmail,
      favorite_stops: updated,
    }, { onConflict: "user_name" });
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
        if (onSuccess) onSuccess({ lat: latitude, lng: longitude });
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
    loading,
    saving,
    locationStatus,
    saveSettings,
    addFavoriteStop,
    removeFavoriteStop,
    addUser,
    removeUser,
    updateUser,
    requestGeolocation,
    handleSignOut,
  };
}