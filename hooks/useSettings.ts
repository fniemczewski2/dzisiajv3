// hooks/useSettings.ts
import { useState, useEffect } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

export function useSettings() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const userEmail = session?.user?.email || process.env.USER_EMAIL;
  
  const [settings, setSettings] = useState({
    sort_order: "priority",
    show_completed: true,
    show_habits: true,
    show_water_tracker: true,
    show_budget_items: true,
    show_notifications: true,
    users: [] as string[],
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);


  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("settings")
        .select(
          "sort_order,show_completed,show_habits,show_water_tracker,show_budget_items,show_notifications,users"
        )
        .eq("user_name", userEmail)
        .maybeSingle();
        
      if (!error && data) {
        setSettings({
          sort_order: data.sort_order,
          show_completed: data.show_completed,
          show_habits: data.show_habits,
          show_water_tracker: data.show_water_tracker,
          show_budget_items: data.show_budget_items,
          show_notifications: data.show_notifications,
          users: data.users || [],
        });
      }
      setLoading(false);
    })();
  }, [session, supabase, userEmail]);

  const addUser = () => {
    if (settings.users.length < 10) {
      setSettings((s) => ({ ...s, users: [...s.users, ""] }));
    }
  };

  const removeUser = (idx: number) => {
    setSettings((s) => ({
      ...s,
      users: s.users.filter((_, i) => i !== idx),
    }));
  };

  const updateUser = (idx: number, value: string) => {
    setSettings((s) => {
      const users = [...s.users];
      users[idx] = value;
      return { ...s, users };
    });
  };

  const saveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session) return;
    setSaving(true);
    
    const payload = {
      user_name: userEmail,
      ...settings,
    };
    
    const { error } = await supabase
      .from("settings")
      .upsert(payload, { onConflict: "user_name" });
      
    setSaving(false);
    return { error };
  };
  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus(
        "Geolokalizacja nie jest obsługiwana przez tę przeglądarkę."
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocationStatus(
          `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`
        );
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus("Odmowa dostępu do lokalizacji.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationStatus("Lokalizacja niedostępna.");
        } else if (error.code === error.TIMEOUT) {
          setLocationStatus("Przekroczono czas oczekiwania na lokalizację.");
        } else {
          setLocationStatus("Nieznany błąd podczas pobierania lokalizacji.");
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
    addUser,
    removeUser,
    updateUser,
    saveSettings,
    requestGeolocation,
    handleSignOut,
  };
}